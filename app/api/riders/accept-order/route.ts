// app/api/riders/accept-order/route.ts
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

    // ── Block if rider has a pending dispute pickup ───────────────────────
    const pendingDisputePickup = await prisma.order.findFirst({
      where: {
        riderId: user.id,
        isDisputed: true,
        status: 'RIDER_ASSIGNED',
        dispute: {
          resolution: '__AWAITING_PICKUP__',
        },
      },
      select: { orderNumber: true },
    })

    if (pendingDisputePickup) {
      return NextResponse.json({
        error: `You have a pending dispute pickup (Order #${pendingDisputePickup.orderNumber}). You must complete that return first before accepting new orders.`,
        blockReason: 'DISPUTE_PICKUP_PENDING',
      }, { status: 400 })
    }

    // ── Block if rider has any other active delivery ──────────────────────
    const activeDelivery = await prisma.order.findFirst({
      where: {
        riderId: user.id,
        status: {
          in: ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'],
        },
        isDisputed: false,
      },
      select: { orderNumber: true, status: true },
    })

    if (activeDelivery) {
      return NextResponse.json({
        error: `You still have an active delivery (Order #${activeDelivery.orderNumber} — ${activeDelivery.status.replace('_', ' ')}). Complete it before accepting a new order.`,
        blockReason: 'ACTIVE_DELIVERY',
      }, { status: 400 })
    }

    // ── Fetch order ───────────────────────────────────────────────────────
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true, buyer: true, seller: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ error: 'Order already assigned or completed' }, { status: 400 })
    }

    if (order.riderId) {
      return NextResponse.json({ error: 'Order already has a rider' }, { status: 400 })
    }

    const riderShare = 560

    // ── Transaction ───────────────────────────────────────────────────────
    await prisma.$transaction(
      async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            riderId: user.id,
            status: 'RIDER_ASSIGNED',
            riderAssignedAt: new Date(),
          },
        })

        const rider = await tx.user.findUnique({
          where: { id: user.id },
          select: { pendingBalance: true },
        })

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'ESCROW',
            amount: riderShare,
            description: `Escrow for delivery: ${order.product.name} (Order: ${order.orderNumber})`,
            reference: `${order.orderNumber}-RIDER-ESCROW`,
            balanceBefore: rider?.pendingBalance || 0,
            balanceAfter: (rider?.pendingBalance || 0) + riderShare,
          },
        })

        await tx.user.update({
          where: { id: user.id },
          data: { pendingBalance: { increment: riderShare } },
        })
      },
      { timeout: 15000, maxWait: 20000 }
    )

    // ── Notify buyer and seller ───────────────────────────────────────────
    Promise.allSettled([
      import('@/lib/notification').then(({ notifyRiderAssigned }) =>
        notifyRiderAssigned(
          order.id,
          order.buyerId,
          order.sellerId,
          user.id,
          user.name,
          order.orderNumber
        )
      ),
    ]).then(results => {
      results.forEach((r) => {
        if (r.status === 'rejected') console.error('Rider assigned notification failed:', r.reason)
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Order accepted successfully',
      riderFee: riderShare,
    })
  } catch (error) {
    console.error('Accept order error:', error)
    return NextResponse.json({
      error: 'Failed to accept order',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}