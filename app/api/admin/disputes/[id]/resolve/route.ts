export const dynamic = 'force-dynamic'
// app/api/admin/disputes/[id]/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { notifyDisputeResolved, notifyPenaltyIssued } from '@/lib/notification'

async function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    return await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, role: true },
    })
  } catch {
    return null
  }
}

const PROCESSING_FEE_RATE = 0.10 // 10% held back on refunds

// POST: Admin resolves a dispute
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized — Admin only' }, { status: 401 })
    }

    const { id: disputeId } = params
    const body = await req.json()
    const {
      status,           // RESOLVED_BUYER_FAVOR | RESOLVED_SELLER_FAVOR | RESOLVED_COMPROMISE | DISMISSED
      resolution,       // Admin's explanation (shown to buyer)
      refundAmount = 0, // Raw refund before fee deduction
      assignRiderForPickup = false, // Whether to assign a rider to collect the item first
      riderId,          // Specific rider to assign (optional)
      penalizeBuyer = false,
      penaltyReason = '',
    } = body

    if (!status || !resolution) {
      return NextResponse.json({ error: 'Status and resolution are required' }, { status: 400 })
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true },
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Calculate actual refund after 10% processing fee
    // Fee applies to REFUND_WITH_PICKUP and RESOLVED_BUYER_FAVOR resolutions
    // because the buyer accepted the item on delivery — partial responsibility lies with them
    const requiresFeeDeduction =
      status === 'RESOLVED_BUYER_FAVOR' ||
      status === 'RESOLVED_COMPROMISE'

    const processingFee = requiresFeeDeduction
      ? Math.round(refundAmount * PROCESSING_FEE_RATE * 100) / 100
      : 0

    const netRefundAmount = Math.round((refundAmount - processingFee) * 100) / 100

    const result = await prisma.$transaction(async (tx) => {
      // Update dispute record
      const updatedDispute = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status,
          resolution,
          refundAmount: requiresFeeDeduction ? netRefundAmount : refundAmount,
          resolvedAt: new Date(),
          resolvedBy: user.id,
        },
      })

      // Handle refund payout (net of processing fee)
      if (requiresFeeDeduction && netRefundAmount > 0) {
        // Deduct from seller's pending balance
        await tx.user.update({
          where: { id: dispute.sellerId },
          data: { pendingBalance: { decrement: netRefundAmount } },
        })

        // Credit buyer's available balance
        await tx.user.update({
          where: { id: dispute.buyerId },
          data: { availableBalance: { increment: netRefundAmount } },
        })

        // Buyer refund transaction
        await tx.transaction.create({
          data: {
            userId: dispute.buyerId,
            type: 'CREDIT',
            amount: netRefundAmount,
            description: `Dispute refund — Order #${dispute.order.orderNumber} (10% processing fee applied)`,
            reference: `DISPUTE-REFUND-${disputeId}`,
            balanceBefore: 0,
            balanceAfter: netRefundAmount,
          },
        })

        // Processing fee goes to platform — record as admin revenue debit from seller
        if (processingFee > 0) {
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
        }
      }

      // Assign rider for item pickup if requested
      if (assignRiderForPickup && riderId) {
        await tx.order.update({
          where: { id: dispute.orderId },
          data: {
            riderId,
            status: 'RIDER_ASSIGNED',
            riderAssignedAt: new Date(),
            disputeReason: `Dispute pickup — ${resolution}`,
          },
        })
      }

      // Penalize buyer for false dispute if needed
      if (penalizeBuyer) {
        await tx.penalty.create({
          data: {
            userId: dispute.buyerId,
            action: 'WARNING',
            reason: penaltyReason || 'Unsubstantiated dispute claim',
            pointsAdded: 2,
            disputeId,
            issuedBy: user.id,
          },
        })

        await tx.user.update({
          where: { id: dispute.buyerId },
          data: {
            penaltyPoints: { increment: 2 },
            warningCount: { increment: 1 },
            lastWarningAt: new Date(),
          },
        })

        await notifyPenaltyIssued(
          dispute.buyerId,
          'WARNING',
          penaltyReason || 'Unsubstantiated dispute claim',
          2
        )
      }

      // Mark order as no longer disputed
      if (!assignRiderForPickup) {
        await tx.order.update({
          where: { id: dispute.orderId },
          data: { isDisputed: false },
        })
      }

      // Notify buyer only (seller is not part of this dispute flow)
      await notifyDisputeResolved(
        disputeId,
        dispute.buyerId,
        dispute.sellerId, // kept for DB compat, but buyer is who's notified
        resolution,
        dispute.order.orderNumber,
        dispute.orderId
      )

      return { updatedDispute, processingFee, netRefundAmount }
    })

    return NextResponse.json({
      success: true,
      dispute: result.updatedDispute,
      summary: {
        grossRefund: refundAmount,
        processingFee: result.processingFee,
        netRefund: result.netRefundAmount,
      },
      message: 'Dispute resolved successfully',
    })
  } catch (error) {
    console.error('Error resolving dispute:', error)
    return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 })
  }
}