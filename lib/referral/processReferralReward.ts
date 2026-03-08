// lib/referral/processReferralReward.ts
// Called inside the confirm-delivery transaction when an order completes.
// Returns silently on any error so it never blocks the main order flow.

import { Prisma } from '@prisma/client'

const PLATFORM_COMMISSION_RATE = 0.05   // 5%
const REFERRER_REWARD_RATE     = 0.10   // 10% of commission

/**
 * Must be called INSIDE an existing prisma.$transaction(tx => ...) block.
 *
 * Checks if the buyer was referred. If so, calculates and credits the
 * referrer's wallet and creates a ReferralReward record + notification.
 *
 * The @unique constraint on ReferralReward.orderId guarantees idempotency.
 */
export async function processReferralReward(
  tx: Prisma.TransactionClient,
  params: {
    orderId:     string
    orderNumber: string
    orderAmount: number   // totalAmount
    buyerId:     string
  }
) {
  const { orderId, orderNumber, orderAmount, buyerId } = params

  // 1. Check if buyer was referred
  const buyer = await tx.user.findUnique({
    where: { id: buyerId },
    select: { referredById: true },
  })

  if (!buyer?.referredById) return   // no referrer — nothing to do

  // 2. Guard: skip if reward already exists for this order
  const existing = await tx.referralReward.findUnique({
    where: { orderId },
    select: { id: true },
  })
  if (existing) return   // idempotency guard (belt + suspenders alongside @unique)

  // 3. Calculate reward
  const commission = orderAmount * PLATFORM_COMMISSION_RATE
  const reward     = commission  * REFERRER_REWARD_RATE
  // e.g. ₦10,000 → commission ₦500 → reward ₦50

  if (reward <= 0) return

  // 4. Fetch referrer's current balance
  const referrer = await tx.user.findUnique({
    where: { id: buyer.referredById },
    select: { id: true, availableBalance: true },
  })
  if (!referrer) return

  const balanceBefore = referrer.availableBalance
  const balanceAfter  = balanceBefore + reward

  // 5. Create ReferralReward record
  await tx.referralReward.create({
    data: {
      referrerId:    referrer.id,
      referredUserId: buyerId,
      orderId,
      amount:        reward,
    },
  })

  // 6. Credit referrer's wallet
  await tx.user.update({
    where: { id: referrer.id },
    data:  { availableBalance: { increment: reward } },
  })

  // 7. Create wallet transaction record
  await tx.transaction.create({
    data: {
      userId:        referrer.id,
      type:          'REFERRAL_REWARD',
      amount:        reward,
      description:   `Referral reward from order #${orderNumber}`,
      reference:     `${orderNumber}-REFERRAL`,
      balanceBefore,
      balanceAfter,
    },
  })

  // 8. Create in-app notification
  await tx.notification.create({
    data: {
      userId:  referrer.id,
      type:    'REFERRAL_REWARD',
      title:   '🎉 Referral Reward Earned!',
      message: `You earned ₦${reward.toLocaleString('en-NG', { minimumFractionDigits: 2 })} from a referral order.`,
      orderId,
      metadata: {
        reward,
        orderNumber,
        commission,
      },
    },
  })
}