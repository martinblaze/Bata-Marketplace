// app/api/admin/reports/[id]/resolve/route.ts - WITH NOTIFICATIONS
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { ReportStatus } from '@prisma/client'
import { notifyReportResolved, notifyPenaltyIssued, notifyAccountSuspended } from '@/lib/notification'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'ADMIN') return null
    return decoded
  } catch {
    return null
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { action, actionNotes, penalizeReported, penaltyReason } = await req.json()

    const report = await prisma.report.findUnique({
      where: { id: params.id }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // Update report
      await tx.report.update({
        where: { id: params.id },
        data: {
          status: 'RESOLVED' as ReportStatus,
          adminNotes: `Action: ${action}\n${actionNotes || ''}`,
          resolvedAt: new Date(),
          resolvedBy: admin.userId
        }
      })

      let bannedUntil: Date | null = null

      // Apply penalties if needed
      if (penalizeReported && report.reportedUserId) {
        const penaltyPoints = action === 'BAN' ? 10 : action === 'SUSPEND' ? 5 : 2
        const penaltyAction = action === 'BAN' ? 'PERMANENT_BAN' : action === 'SUSPEND' ? 'TEMP_BAN_7DAYS' : 'WARNING'
        
        await tx.penalty.create({
          data: {
            userId: report.reportedUserId,
            action: penaltyAction,
            reason: penaltyReason || actionNotes || `Report resolution: ${action}`,
            pointsAdded: penaltyPoints,
            reportId: params.id,
            issuedBy: admin.userId
          }
        })

        const updateData: any = {
          penaltyPoints: { increment: penaltyPoints }
        }

        if (action === 'BAN') {
          updateData.isSuspended = true
          bannedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // Permanent
        } else if (action === 'SUSPEND') {
          updateData.isSuspended = true
          updateData.suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          bannedUntil = updateData.suspendedUntil
        }

        await tx.user.update({
          where: { id: report.reportedUserId },
          data: updateData
        })

        // ✅ NOTIFICATION: Notify reported user about penalty
        // Signature: notifyPenaltyIssued(userId, penaltyAction, reason, points)
        await notifyPenaltyIssued(
          report.reportedUserId,
          penaltyAction,
          penaltyReason || actionNotes || `Report resolution: ${action}`,
          penaltyPoints
        )

        // ✅ NOTIFICATION: If suspended, notify about suspension
        if (bannedUntil) {
          // Signature: notifyAccountSuspended(userId, until, reason)
          await notifyAccountSuspended(
            report.reportedUserId,
            bannedUntil,
            penaltyReason || actionNotes || `Report resolution: ${action}`
          )
        }
      }

      // ✅ NOTIFICATION: Notify reporter and reported user about resolution
      // Signature: notifyReportResolved(reportId, reporterId, reportedUserId, resolution)
      await notifyReportResolved(
        params.id,
        report.reporterId,
        report.reportedUserId,
        `${action}: ${actionNotes || 'No additional notes'}`
      )
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resolve report error:', error)
    return NextResponse.json({ error: 'Failed to resolve report' }, { status: 500 })
  }
}