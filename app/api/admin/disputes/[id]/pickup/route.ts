// app/api/admin/disputes/[id]/pickup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

async function getAdminFromToken(req: NextRequest) {
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

// POST: Three actions — send_rider | confirm_received | release_refund | release_rider_pay
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAdminFromToken(req)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: disputeId } = params
    const { action } = await req.json()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: { include: { rider: true } },
      },
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // ── STEP 1: Send the original rider back to collect the item ──────────
    if (action === 'send_rider') {
      const rider = dispute.order.rider

      if (!rider) {
        return NextResponse.json({
          error: 'No rider found on this order. The order may not have been delivered by a platform rider.',
        }, { status: 400 })
      }

      // Notify the rider via notification
      const { default: prismaClient } = await import('@/lib/prisma')
      await prismaClient.notification.create({
        data: {
          userId: rider.id,
          type: 'ORDER_DISPUTED',
          title: 'Pickup Required — Disputed Order',
          message: `Please return to collect the item for Order #${dispute.order.orderNumber}. The buyer has raised a dispute. You will receive ₦560 once the item is confirmed received.`,
          orderId: dispute.orderId,
          disputeId,
          metadata: {
            action: 'DISPUTE_PICKUP',
            orderNumber: dispute.order.orderNumber,
            riderPay: 560,
          },
        },
      })

      // Update dispute AND order so the rider dashboard query can find it
      await prismaClient.$transaction([
        prismaClient.dispute.update({
          where: { id: disputeId },
          data: {
            status: 'UNDER_REVIEW',
            resolution: '__AWAITING_PICKUP__',
          },
        }),
        prismaClient.order.update({
          where: { id: dispute.orderId },
          data: {
            status: 'RIDER_ASSIGNED',
            isDisputed: true,
            riderId: rider.id,
          },
        }),
      ])

      return NextResponse.json({
        success: true,
        message: `Rider ${rider.name} has been notified to collect the item.`,
        rider: { id: rider.id, name: rider.name, phone: rider.phone },
      })
    }

    // ── STEP 2: Admin confirms item has been collected/received ───────────
    if (action === 'confirm_received') {
      await prisma.dispute.update({
        where: { id: disputeId },
        data: { resolution: '__ITEM_RECEIVED__' },
      })

      return NextResponse.json({
        success: true,
        message: 'Item marked as received. You can now release the refund and rider payment.',
      })
    }

    // ── STEP 3a: Release refund to buyer (90% of order total) ─────────────
    if (action === 'release_refund') {
      if (!['__ITEM_RECEIVED__', '__RIDER_PAID__'].includes(dispute.resolution || '')) {
        return NextResponse.json({
          error: 'Cannot release refund — item not yet confirmed as received.',
        }, { status: 400 })
      }

      const orderTotal = dispute.order.totalAmount
      const processingFee = Math.round(orderTotal * 0.10 * 100) / 100
      const netRefund = Math.round((orderTotal - processingFee) * 100) / 100

      await prisma.$transaction(async (tx) => {
        // Deduct from seller pending balance
        await tx.user.update({
          where: { id: dispute.sellerId },
          data: { pendingBalance: { decrement: netRefund } },
        })

        // Credit buyer
        const buyer = await tx.user.findUnique({
          where: { id: dispute.buyerId },
          select: { availableBalance: true },
        })
        await tx.user.update({
          where: { id: dispute.buyerId },
          data: { availableBalance: { increment: netRefund } },
        })

        // Transaction record
        await tx.transaction.create({
          data: {
            userId: dispute.buyerId,
            type: 'CREDIT',
            amount: netRefund,
            description: `Dispute refund — Order #${dispute.order.orderNumber} (10% fee deducted)`,
            reference: `DISPUTE-REFUND-${disputeId}`,
            balanceBefore: buyer?.availableBalance || 0,
            balanceAfter: (buyer?.availableBalance || 0) + netRefund,
          },
        })

        // Fee debit on seller
        await tx.transaction.create({
          data: {
            userId: dispute.sellerId,
            type: 'DEBIT',
            amount: processingFee,
            description: `Dispute processing fee — Order #${dispute.order.orderNumber}`,
            reference: `DISPUTE-FEE-${disputeId}`,
            balanceBefore: 0,
            balanceAfter: 0,
          },
        })

        // If rider was already paid, fully resolve. Otherwise await rider pay.
        const riderAlreadyPaid = dispute.resolution === '__RIDER_PAID__'
        await tx.dispute.update({
          where: { id: disputeId },
          data: riderAlreadyPaid
            ? {
                refundAmount: netRefund,
                status: 'RESOLVED_BUYER_FAVOR',
                resolution: 'Item collected, refund and rider payment released.',
                resolvedAt: new Date(),
                resolvedBy: admin.id ?? admin.userId ?? null,
              }
            : {
                refundAmount: netRefund,
                resolution: '__REFUND_RELEASED__',
              },
        })

        if (riderAlreadyPaid) {
          await tx.order.update({
            where: { id: dispute.orderId },
            data: { isDisputed: false },
          })
        }

        // Notify buyer
        await tx.notification.create({
          data: {
            userId: dispute.buyerId,
            type: 'DISPUTE_RESOLVED',
            title: 'Refund Processed',
            message: `Your refund of ₦${netRefund.toLocaleString()} has been added to your wallet for Order #${dispute.order.orderNumber}.`,
            orderId: dispute.orderId,
            disputeId,
            metadata: { refundAmount: netRefund, processingFee },
          },
        })
      })

      return NextResponse.json({
        success: true,
        message: `Refund of ₦${netRefund.toLocaleString()} sent to buyer's wallet.`,
        netRefund,
        processingFee,
      })
    }

    // ── STEP 3b: Release ₦560 rider payment ───────────────────────────────
    if (action === 'release_rider_pay') {
      if (!['__ITEM_RECEIVED__', '__REFUND_RELEASED__'].includes(dispute.resolution || '')) {
        return NextResponse.json({
          error: 'Cannot release rider payment — item not yet confirmed as received.',
        }, { status: 400 })
      }

      const rider = dispute.order.rider
      if (!rider) {
        return NextResponse.json({ error: 'No rider on this order' }, { status: 400 })
      }

      const riderPay = 560

      await prisma.$transaction(async (tx) => {
        // Move from pending to available for rider
        const riderRecord = await tx.user.findUnique({
          where: { id: rider.id },
          select: { pendingBalance: true, availableBalance: true },
        })

        await tx.user.update({
          where: { id: rider.id },
          data: {
            pendingBalance: { decrement: riderPay },
            availableBalance: { increment: riderPay },
          },
        })

        await tx.transaction.create({
          data: {
            userId: rider.id,
            type: 'CREDIT',
            amount: riderPay,
            description: `Dispute pickup payment — Order #${dispute.order.orderNumber}`,
            reference: `DISPUTE-RIDER-${disputeId}`,
            balanceBefore: riderRecord?.availableBalance || 0,
            balanceAfter: (riderRecord?.availableBalance || 0) + riderPay,
          },
        })

        // Only fully resolve if buyer refund was already released too
        const refundAlreadyReleased = dispute.resolution === '__REFUND_RELEASED__'

        await tx.dispute.update({
          where: { id: disputeId },
          data: refundAlreadyReleased
            ? {
                status: 'RESOLVED_BUYER_FAVOR',
                resolution: `Item collected, refund and rider payment released.`,
                resolvedAt: new Date(),
                resolvedBy: admin.id ?? admin.userId ?? null,
              }
            : {
                // Rider paid but buyer refund still pending — keep dispute open
                resolution: '__RIDER_PAID__',
              },
        })

        if (refundAlreadyReleased) {
          await tx.order.update({
            where: { id: dispute.orderId },
            data: { isDisputed: false },
          })
        }

        // Notify rider
        await tx.notification.create({
          data: {
            userId: rider.id,
            type: 'PAYMENT_RECEIVED',
            title: 'Pickup Payment Released',
            message: `₦${riderPay} for collecting the disputed item (Order #${dispute.order.orderNumber}) has been added to your available balance.`,
            orderId: dispute.orderId,
            disputeId,
            metadata: { amount: riderPay },
          },
        })
      })

      return NextResponse.json({
        success: true,
        message: `₦${riderPay} released to ${rider.name}'s wallet.`,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Dispute pickup action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}