// app/api/orders/confirm-delivery/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import { processReferralReward } from '@/lib/referral/processReferralReward'

export const dynamic = 'force-dynamic'

const recentConfirmations = new Map<string, number>()
const CONFIRMATION_COOLDOWN = 5000

function cleanupOldEntries() {
  const now = Date.now()
  const keysToDelete: string[] = []
  recentConfirmations.forEach((timestamp, key) => {
    if (now - timestamp > 60000) keysToDelete.push(key)
  })
  keysToDelete.forEach(key => recentConfirmations.delete(key))
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // ── DUPLICATE PREVENTION ──────────────────────────────────
    const confirmKey = `${user.id}-${orderId}`
    const lastConfirmTime = recentConfirmations.get(confirmKey)
    const now = Date.now()

    if (lastConfirmTime && (now - lastConfirmTime) < CONFIRMATION_COOLDOWN) {
      const remainingTime = Math.ceil((CONFIRMATION_COOLDOWN - (now - lastConfirmTime)) / 1000)
      return NextResponse.json(
        { error: `Please wait ${remainingTime} seconds before confirming again` },
        { status: 429 }
      )
    }

    recentConfirmations.set(confirmKey, now)
    cleanupOldEntries()

    // ── Fetch order ───────────────────────────────────────────
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { seller: true, rider: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.buyerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (order.status === 'COMPLETED') {
      return NextResponse.json(
        {
          error: 'Order already completed',
          message: 'This order has already been confirmed and payment released',
          alreadyCompleted: true,
        },
        { status: 400 }
      )
    }

    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: `Cannot confirm. Order status is: ${order.status}` },
        { status: 400 }
      )
    }

    // ═══════════════════════════════════════════════════════
    // TRANSACTION: all DB operations including referral reward
    // ═══════════════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark order COMPLETED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      // 2. Release seller payment
      const sellerAvailable = order.seller.availableBalance || 0
      const sellerShare = order.totalAmount - order.platformCommission - (order.rider ? 560 : 0)

      await tx.user.update({
        where: { id: order.sellerId },
        data: {
          pendingBalance:   { decrement: sellerShare },
          availableBalance: { increment: sellerShare },
        },
      })

      await tx.transaction.create({
        data: {
          userId:        order.sellerId,
          type:          'CREDIT',
          amount:        sellerShare,
          description:   `Payment received for Order: ${order.orderNumber}`,
          reference:     `${order.orderNumber}-SELLER-RELEASE`,
          balanceBefore: sellerAvailable,
          balanceAfter:  sellerAvailable + sellerShare,
        },
      })

      // 3. Release rider payment (if assigned)
      if (order.riderId) {
        const rider = await tx.user.findUnique({
          where:  { id: order.riderId },
          select: { availableBalance: true },
        })

        const riderShare   = 560
        const riderBalance = rider?.availableBalance || 0

        await tx.user.update({
          where: { id: order.riderId },
          data:  { availableBalance: { increment: riderShare } },
        })

        await tx.transaction.create({
          data: {
            userId:        order.riderId,
            type:          'CREDIT',
            amount:        riderShare,
            description:   `Delivery fee for Order: ${order.orderNumber}`,
            reference:     `${order.orderNumber}-RIDER-RELEASE`,
            balanceBefore: riderBalance,
            balanceAfter:  riderBalance + riderShare,
          },
        })
      }

      // 4. ── REFERRAL REWARD (new) ──────────────────────────
      await processReferralReward(tx, {
        orderId,
        orderNumber: order.orderNumber,
        orderAmount: order.totalAmount,
        buyerId:     order.buyerId,
      })
      // processReferralReward is silent on errors and no-ops if no referrer

      return updatedOrder
    }, {
      timeout: 15000,
      maxWait:  20000,
    })

    console.log(`✅ Order ${order.orderNumber} completed by buyer ${user.name}`)

    return NextResponse.json({
      success: true,
      message: '🎉 Payment released! Seller and rider have been paid.',
      order:   result,
    })
  } catch (error) {
    console.error('Confirm delivery error:', error)

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          error:            'Order already processed',
          message:          'This order has already been confirmed',
          alreadyCompleted: true,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to confirm delivery' },
      { status: 500 }
    )
  }
}