import webpush, { PushSubscription as WebPushSubscription } from 'web-push'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendEmail'
import {
  orderPlacedEmail, newOrderEmail, riderAssignedEmail,
  orderOnTheWayEmail, orderDeliveredEmail, paymentReceivedEmail,
  withdrawalProcessedEmail, disputeOpenedEmail, disputeResolvedEmail,
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

// Returns true if at least one push was delivered
async function sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } })
    if (subscriptions.length === 0) return false

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSub: WebPushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }
        try {
          await webpush.sendNotification(pushSub, JSON.stringify(payload))
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
          }
          throw error
        }
      })
    )

    return results.some((r) => r.status === 'fulfilled')
  } catch {
    return false
  }
}

async function getUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  return user?.email ?? null
}

// Push first — email only if push fails or no subscription
async function notify(
  userId: string,
  push: PushPayload,
  emailFn: () => Promise<{ subject: string; html: string }>
) {
  const pushed = await sendPushToUser(userId, push)
  if (!pushed) {
    const email = await getUserEmail(userId)
    if (email) {
      const { subject, html } = await emailFn()
      await sendEmail({ to: email, subject, html })
    }
  }
}

// ─── Public notification functions ───────────────────────────────────────────

export async function notifyOrderPlaced(buyerId: string, orderNumber: string) {
  await notify(
    buyerId,
    { title: '🛒 Order Placed!', message: `Your order #${orderNumber} was placed successfully.`, url: `/orders/${orderNumber}`, tag: 'order-placed' },
    async () => orderPlacedEmail(orderNumber)
  )
}

export async function notifyNewOrder(sellerId: string, orderNumber: string) {
  await notify(
    sellerId,
    { title: '🎉 New Order!', message: `You have a new order #${orderNumber}. Confirm it now.`, url: `/orders/sales`, tag: 'new-order', requireInteraction: true },
    async () => newOrderEmail(orderNumber)
  )
}

export async function notifyRiderAssigned(buyerId: string, orderNumber: string) {
  await notify(
    buyerId,
    { title: '🚴 Rider Assigned', message: `A rider has been assigned to order #${orderNumber}.`, url: `/orders/${orderNumber}`, tag: 'rider-assigned' },
    async () => riderAssignedEmail(orderNumber)
  )
}

export async function notifyOrderOnTheWay(buyerId: string, orderNumber: string) {
  await notify(
    buyerId,
    { title: '🛵 Order On The Way!', message: `Your order #${orderNumber} is on its way.`, url: `/orders/${orderNumber}`, tag: 'order-on-the-way', requireInteraction: true },
    async () => orderOnTheWayEmail(orderNumber)
  )
}

export async function notifyOrderDelivered(buyerId: string, orderNumber: string) {
  await notify(
    buyerId,
    { title: '✅ Order Delivered!', message: `Your order #${orderNumber} has been delivered.`, url: `/orders/${orderNumber}`, tag: 'order-delivered', requireInteraction: true },
    async () => orderDeliveredEmail(orderNumber)
  )
}

export async function notifyPaymentReceived(sellerId: string, amount: string) {
  await notify(
    sellerId,
    { title: '💰 Payment Received', message: `You received a payment of ${amount}.`, url: `/wallet`, tag: 'payment-received' },
    async () => paymentReceivedEmail(amount)
  )
}

export async function notifyWithdrawalProcessed(userId: string, amount: string) {
  await notify(
    userId,
    { title: '💸 Withdrawal Processed', message: `Your withdrawal of ${amount} has been processed.`, url: `/wallet`, tag: 'withdrawal-processed' },
    async () => withdrawalProcessedEmail(amount)
  )
}

export async function notifyDisputeOpened(userId: string, orderNumber: string) {
  await notify(
    userId,
    { title: '⚠️ Dispute Opened', message: `A dispute was opened for order #${orderNumber}.`, url: `/disputes`, tag: 'dispute-opened', requireInteraction: true },
    async () => disputeOpenedEmail(orderNumber)
  )
}

export async function notifyDisputeResolved(userId: string, orderNumber: string) {
  await notify(
    userId,
    { title: '✅ Dispute Resolved', message: `The dispute for order #${orderNumber} has been resolved.`, url: `/disputes`, tag: 'dispute-resolved' },
    async () => disputeResolvedEmail(orderNumber)
  )
}

export async function notifyNewReview(sellerId: string, productName: string) {
  await notify(
    sellerId,
    { title: '⭐ New Review', message: `${productName} just received a new review.`, url: `/reviews`, tag: 'new-review' },
    async () => newReviewEmail(productName)
  )
}