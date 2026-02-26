export const dynamic = 'force-dynamic'
// app/api/riders/available-orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'RIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Regular pending orders (not disputed)
    const orders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        riderId: null,
        isDisputed: false,
      },
      include: {
        product: true,
        seller: { select: { name: true, phone: true } },
        buyer:  { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Dispute pickup jobs assigned specifically to this rider
    // These are orders that were disputed and admin sent THIS rider back to collect
    const disputePickups = await prisma.order.findMany({
      where: {
        riderId: user.id,
        isDisputed: true,
        status: 'RIDER_ASSIGNED',
        dispute: {
          resolution: '__AWAITING_PICKUP__',
        },
      },
      include: {
        product: true,
        seller: { select: { name: true, phone: true } },
        buyer:  { select: { name: true, phone: true } },
        dispute: {
          select: {
            id: true,
            reason: true,
            pickupAddress: true,
          },
        },
      },
    })

    return NextResponse.json({
      orders,
      disputePickups, // separate array so dashboard can render them differently
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
