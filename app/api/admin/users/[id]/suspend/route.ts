export const dynamic = 'force-dynamic'
// app/api/admin/users/[id]/suspend/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { notifyAccountSuspended } from '@/lib/notification'

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
    const body = await req.json()
    const { reason = 'Administrative action', days = 30 } = body

    // days = 0 means permanent
    const suspendedUntil = days === 0
      ? null
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: params.id },
      data: {
        isSuspended: true,
        suspendedUntil,
        suspensionReason: reason,
      },
    })

    // Send notification — handle permanent (null) vs temporary separately
    if (suspendedUntil) {
      await notifyAccountSuspended(params.id, suspendedUntil, reason)
    } else {
      // Permanent ban — notify with a far future date as placeholder
      const farFuture = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
      await notifyAccountSuspended(params.id, farFuture, reason)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Suspend error:', error)
    return NextResponse.json({ error: 'Failed to suspend user' }, { status: 500 })
  }
}