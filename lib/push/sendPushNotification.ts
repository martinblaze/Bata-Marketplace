// lib/push/sendPushNotification.ts
// Server-side only — never import this in client components

import webpush, { PushSubscription as WebPushSubscription } from 'web-push'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendEmail'
import {
  orderPlacedEmail,
  newOrderEmail,
  riderAssignedEmail,
  orderOnTheWayEmail,
  orderDeliveredEmail,
  paymentReceivedEmail,
  withdrawalProcessedEmail,
  disputeOpenedEmail,
  disputeResolvedEmail,
  newReviewEmail,
} from '@/lib/email/emailTemplates'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushPayload {
  title: string
  message: string
  url?: string
  tag?: string
  requireInteraction?: boolean
}

// ─── Core push sender ─────────────────────────────────────────────────────────
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    })

    if (subscriptions.length === 0) return

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription: WebPushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }

        try {
          await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
        } catch (error: unknown) {
          const webPushError = error as { statusCode?: number }
          // Subscription expired or invalid — clean it up
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
          }
          throw error
        }
      })
    )
  } catch (error) {
    console.error('Send push error:', error)
  }
}

// ─── Helper to get user email from DB ────────────────────────────────────────
async function getUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  })
  return user?.email ?? null
}

// ─── Notification helpers (push + email) ─────────────────────────────────────

export async function notifyOrderPlaced(buyerId: string, orderNumber: string) {
  const email = await getUserEmail(buyerId)
  const { subject, html } = orderPlacedEmail(orderNumber)

  await Promise.allSettled([
    sendPushToUser(buyerId, {
      title: '🛒 Order Placed!',
      message: `Your order #${orderNumber} has been placed successfully.`,
      url: `/orders/${orderNumber}`,
      tag: 'order-placed',
    }),
    email ? sendEmail({ to: email, subject, html }) : Promise.resolve(),
  ])
}

export async function notifyNewOrder(sellerId: string, orderNumber: string) {
  const email = await getUserEmail(sellerId)
  const { subject, html } = newOrderEmail(orderNumber)

  await Promise.allSettled([
    sendPushToUser(sellerId, {
      title: '🎉 New Order Received!',
      message: `You have a new order #${orderNumber}. Confirm it now.`,
      url: `/orders/sales`,
      tag: 'new-order',
      requireInteraction: true,
    }),
    email ? sendEmail({ to: email, subject, html }) : Promise.resolve(),
  ])
}

export async function notifyRiderAssigned(buyerId: string, orderNumber: string) {
  const email = await getUserEmail(buyerId)
  const { subject, html } = riderAssignedEmail(orderNumber)

  await Promise.allSettled([
    sendPushToUser(buyerId, {
      title: '🚴 Rider Assigned',
      message: `A rider has been assigned to your order #${orderNumber}.`,
      url: `/orders/${orderNumber}`,
      tag: 'rider-assigned',
    }),
    email ? sendEmail({ to: email, subject, html }) : Promise.resolve(),
  ])
}

export async function notifyOrderOnTheWay(buyerId: string, orderNumber: string) {
  const email = await getUserEmail(buyerId)
  const { subject, html } = orderOnTheWayEmail(orderNumber)

  await Promise.allSettled([
    sendPushToUser(buyerId, {
      title: '🛵 Order On The Way!',
      message: `Your order #${orderNumber} is on its way to you.`,
      url: `/orders/${orderNumber}`,
      tag: 'order-on-the-way',
      requireInteraction: true,
    }),
    email ? sendEmail({ to: email, subject, html }) : Promise.resolve(),
  ])
}

export async function notifyOrderDelivered(buyerId: string, orderNumber: string) {
  const email = await getUserEmail(buyerId)
  const { subject, html } = orderDeliveredEmail(orderNumber)

  await Promise.allSettled([
    sendPushToUser(buyerId, {
      title: '✅ Order Delivered!',
      message: `Your order #${orderNumber} has been delivered. Enjoy!`,
      url: `/orders/${orderNumber}`,
      tag: 'order-delivered',
      requireInteraction: true,
    }),
    email ? sendEmail({ to: email, subject, html }) : Promise.resolve(),
  ])
}

export async function notifyPaymentReceived(sellerId: string, amount: string) {
  const email = await getUserEmail(sellerId)
  const { subject, html } = paymentReceivedEmail(amount)

  await Promise.allSettled([
    sendPushToUser(sellerId, {
      title: '💰 Payment Received',
      message: `You received a payment of ${amount}.`,
      url: `/wallet`,
      tag: 'payment-received',
    }),
    email ? sendEmail({ to: email, subject, html }) : Promise.resolve(),
  ])
}

export async function notifyWithdrawalProcessed(userId: string, amount: string) {
  const email = await getUserEmail(userId)
  const { subject, html } = withdrawalProcessedEmail(amount)

  await Promise.allSettled([
    sendPushToUser(userId, {
      title: '💸 Withdrawal Processed',
      message: `Your withdrawal of ${amount} has been processed.`,
      url: `/wallet`,
      tag: 'withdrawal-processed',
    }),
    email ? sendEmail({ to: email, subject, html }) : Promise.resolve(),
  ])
}

export async function notifyDisputeOpened(userId: string, orderNumber: string) {
  const email = await getUserEmail(userId)
  const { subject, html } = disputeOpenedEmail(orderNumber)

  await Promise.allSettled([
    sendPushToUser(userId, {
      title: '⚠️ Dispute Opened',
      message: `A dispute has been opened for order #${orderNumber}.`,
      url: `/disputes`,
      tag: 'dispute-opened',
      requireInteraction: true,
    }),
    email ? sendEmail({ to: email, subject, html }) : Promise.resolve(),
  ])
}

export async function notifyDisputeResolved(userId: string, orderNumber: string) {
  const email = await getUserEmail(userId)
  const { subject, html } = disputeResolvedEmail(orderNumber)

  await Promise.allSettled([
    sendPushToUser(userId, {
      title: '✅ Dispute Resolved',
      message: `The dispute for order #${orderNumber} has been resolved.`,
      url: `/disputes`,
      tag: 'dispute-resolved',
    }),
    email ? sendEmail({ to: email, subject, html }) : Promise.resolve(),
  ])
}

export async function notifyNewReview(sellerId: string, productName: string) {
  const email = await getUserEmail(sellerId)
  const { subject, html } = newReviewEmail(productName)

  await Promise.allSettled([
    sendPushToUser(sellerId, {
      title: '⭐ New Review',
      message: `${productName} just received a new review.`,
      url: `/reviews`,
      tag: 'new-review',
    }),
    email ? sendEmail({ to: email, subject, html }) : Promise.resolve(),
  ])
}