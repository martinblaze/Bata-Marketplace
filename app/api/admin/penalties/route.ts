export const dynamic = 'force-dynamic'
// app/api/admin/penalties/route.ts - WITH NOTIFICATIONS
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { notifyPenaltyIssued, notifyAccountSuspended } from '@/lib/notification'

async function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  
  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    return await prisma.user.findUnique({ 
      where: { id: decoded.userId },
      select: { id: true, name: true, role: true }
    })
  } catch (error) {
    return null
  }
}

// Calculate ban duration based on action
function getBanDuration(action: string): Date | null {
  const now = Date.now()
  switch (action) {
    case 'TEMP_BAN_1DAY':
      return new Date(now + 1 * 24 * 60 * 60 * 1000)
    case 'TEMP_BAN_3DAYS':
      return new Date(now + 3 * 24 * 60 * 60 * 1000)
    case 'TEMP_BAN_7DAYS':
      return new Date(now + 7 * 24 * 60 * 60 * 1000)
    case 'TEMP_BAN_30DAYS':
      return new Date(now + 30 * 24 * 60 * 60 * 1000)
    case 'PERMANENT_BAN':
      return new Date(now + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years
    default:
      return null
  }
}

// Calculate penalty points based on action
function getPenaltyPoints(action: string): number {
  switch (action) {
    case 'WARNING':
      return 1
    case 'TEMP_BAN_1DAY':
      return 3
    case 'TEMP_BAN_3DAYS':
      return 5
    case 'TEMP_BAN_7DAYS':
      return 7
    case 'TEMP_BAN_30DAYS':
      return 10
    case 'PERMANENT_BAN':
      return 50
    case 'TRUST_LEVEL_DOWNGRADE':
      return 2
    default:
      return 1
  }
}

// POST: Issue penalty to user
export async function POST(req: NextRequest) {
  try {
    const admin = await getUserFromToken(req)
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      userId, 
      action, 
      reason,
      reportId,
      disputeId
    } = body

    if (!userId || !action || !reason) {
      return NextResponse.json({ 
        error: 'User ID, action, and reason are required' 
      }, { status: 400 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true, 
        penaltyPoints: true,
        trustLevel: true 
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const pointsAdded = getPenaltyPoints(action)
    const bannedUntil = getBanDuration(action)

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create penalty record
      const penalty = await tx.penalty.create({
        data: {
          userId,
          action,
          reason,
          pointsAdded,
          reportId,
          disputeId,
          bannedUntil,
          issuedBy: admin.id
        }
      })

      // Update user
      const updateData: any = {
        penaltyPoints: { increment: pointsAdded }
      }

      // Handle warnings
      if (action === 'WARNING') {
        updateData.warningCount = { increment: 1 }
        updateData.lastWarningAt = new Date()
      }

      // Handle bans
      if (action.includes('BAN')) {
        updateData.isSuspended = true
        updateData.suspendedUntil = bannedUntil
      }

      // Handle trust level downgrade
      if (action === 'TRUST_LEVEL_DOWNGRADE') {
        const trustLevels = ['BRONZE', 'SILVER', 'GOLD', 'VERIFIED']
        const currentIndex = trustLevels.indexOf(user.trustLevel)
        if (currentIndex > 0) {
          updateData.trustLevel = trustLevels[currentIndex - 1]
        }
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          penaltyPoints: true,
          warningCount: true,
          isSuspended: true,
          suspendedUntil: true,
          trustLevel: true
        }
      })

      // ✅ NOTIFICATION: Notify user about penalty
      // Signature: notifyPenaltyIssued(userId, penaltyAction, reason, points)
      await notifyPenaltyIssued(
        userId,
        action,
        reason,
        pointsAdded
      )

      // ✅ NOTIFICATION: If suspended, send suspension notification
      if (action.includes('BAN') && bannedUntil) {
        // Signature: notifyAccountSuspended(userId, until, reason)
        await notifyAccountSuspended(
          userId,
          bannedUntil,
          reason
        )
      }

      return { penalty, user: updatedUser }
    })

    return NextResponse.json({ 
      success: true,
      penalty: result.penalty,
      user: result.user,
      message: `Penalty issued successfully to ${user.name}` 
    })
  } catch (error) {
    console.error('Error issuing penalty:', error)
    return NextResponse.json({ error: 'Failed to issue penalty' }, { status: 500 })
  }
}

// GET: Fetch all penalties (admin only)
export async function GET(req: NextRequest) {
  try {
    const admin = await getUserFromToken(req)
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 })
    }

    const penalties = await prisma.penalty.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            penaltyPoints: true,
            isSuspended: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    return NextResponse.json({ penalties })
  } catch (error) {
    console.error('Error fetching penalties:', error)
    return NextResponse.json({ error: 'Failed to fetch penalties' }, { status: 500 })
  }
}
