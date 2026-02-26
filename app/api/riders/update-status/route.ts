// app/api/riders/update-status/route.ts
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

    const { orderId, status } = await request.json()

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        riderId: true,
        buyerId: true,
        sellerId: true,
        orderNumber: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.riderId !== user.id) {
      return NextResponse.json({ error: 'Not your delivery' }, { status: 403 })
    }

    const updateData: any = { status }
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date()
    }

    // ── Database transaction only ─────────────────────────────────────────
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: updateData,
      })

      if (status === 'DELIVERED') {
        await tx.user.update({
          where: { id: user.id },
          data: { completedOrders: { increment: 1 } },
        })
      }

      return updated
    }, {
      timeout: 15000,
      maxWait: 20000,
    })

    // ── Fire notifications after transaction (non-blocking) ───────────────
    const riderName = user.name || 'Your rider'
    const orderNumber = order.orderNumber

    Promise.allSettled([
      (async () => {
        const {
          notifyOrderPickedUp,
          notifyOrderOnTheWay,
          notifyOrderDelivered,
        } = await import('@/lib/notification')

        const {
          notifyOrderOnTheWay: pushOnTheWay,
          notifyOrderDelivered: pushDelivered,
        } = await import('@/lib/push/sendPushNotification')

        if (status === 'PICKED_UP') {
          // In-app bell only (no push template for picked up)
          await notifyOrderPickedUp(orderId, order.buyerId, orderNumber, riderName)

        } else if (status === 'ON_THE_WAY') {
          await Promise.allSettled([
            notifyOrderOnTheWay(orderId, order.buyerId, orderNumber, riderName),
            pushOnTheWay(order.buyerId, orderNumber),
          ])

        } else if (status === 'DELIVERED') {
          await Promise.allSettled([
            notifyOrderDelivered(orderId, order.buyerId, orderNumber),
            pushDelivered(order.buyerId, orderNumber),
          ])
        }
      })(),
    ]).then(results => {
      results.forEach((r) => {
        if (r.status === 'rejected') {
          console.error('Status notification failed:', r.reason)
        }
      })
    })

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('Update status error:', error)
    return NextResponse.json({
      error: 'Failed to update status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}