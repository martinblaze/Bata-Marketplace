// app/api/riders/dispute-picked-up/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user || user.role !== 'RIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // Verify this dispute pickup belongs to this rider
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        riderId: user.id,
        isDisputed: true,
        status: 'RIDER_ASSIGNED',
        dispute: { resolution: '__AWAITING_PICKUP__' },
      },
      include: {
        dispute: { select: { id: true } },
        buyer:   { select: { id: true, name: true } },
      },
    })

    if (!order) {
      return NextResponse.json({
        error: 'Pickup job not found or already completed',
      }, { status: 404 })
    }

    // Update order status so admin knows rider is on the way back
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PICKED_UP' },
    })

    // Notify admin via notification (admin can poll or see in dashboard)
    await prisma.notification.create({
      data: {
        userId: order.buyer.id, // admin will see this via admin notifications
        type: 'ORDER_DISPUTED',
        title: 'Dispute Item Collected by Rider',
        message: `Rider ${user.name} has collected the disputed item from ${order.buyer.name} (Order #${order.orderNumber}) and is on the way back.`,
        orderId,
        disputeId: order.dispute!.id,
        metadata: {
          riderId:   user.id,
          riderName: user.name,
          event:     'DISPUTE_ITEM_COLLECTED',
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Marked as collected. Return the item to complete and earn your ₦560.',
    })
  } catch (error) {
    console.error('Dispute picked up error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}