// lib/notifications.ts
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  orderId?: string
  productId?: string
  disputeId?: string
  reportId?: string
  reviewId?: string
  metadata?: any
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        orderId: params.orderId,
        productId: params.productId,
        disputeId: params.disputeId,
        reportId: params.reportId,
        reviewId: params.reviewId,
        metadata: params.metadata || null
      }
    })

    return notification
  } catch (error) {
    console.error('Create notification error:', error)
    return null
  }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  try {
    const notifications = await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        orderId: params.orderId,
        productId: params.productId,
        disputeId: params.disputeId,
        reportId: params.reportId,
        reviewId: params.reviewId,
        metadata: params.metadata || null
      }))
    })

    return notifications
  } catch (error) {
    console.error('Create bulk notifications error:', error)
    return null
  }
}

// ==========================================
// ORDER NOTIFICATIONS
// ==========================================

export async function notifyOrderPlaced(orderId: string, buyerId: string, sellerId: string, orderNumber: string, productName: string) {
  // Notify seller
  await createNotification({
    userId: sellerId,
    type: 'ORDER_PLACED',
    title: '🛒 New Order Received!',
    message: `You have a new order (#${orderNumber}) for ${productName}`,
    orderId,
    metadata: { orderNumber, productName }
  })
}

export async function notifyRiderAssigned(orderId: string, buyerId: string, sellerId: string, riderId: string, riderName: string, orderNumber: string) {
  // Notify buyer
  await createNotification({
    userId: buyerId,
    type: 'RIDER_ASSIGNED',
    title: '🚴 Rider Assigned!',
    message: `${riderName} has been assigned to deliver your order (#${orderNumber})`,
    orderId,
    metadata: { orderNumber, riderName }
  })

  // Notify seller
  await createNotification({
    userId: sellerId,
    type: 'RIDER_ASSIGNED',
    title: '🚴 Rider Assigned',
    message: `${riderName} will deliver order #${orderNumber}`,
    orderId,
    metadata: { orderNumber, riderName }
  })
}

export async function notifyOrderPickedUp(orderId: string, buyerId: string, orderNumber: string, riderName: string) {
  await createNotification({
    userId: buyerId,
    type: 'ORDER_PICKED_UP',
    title: '📦 Order Picked Up!',
    message: `${riderName} has picked up your order (#${orderNumber})`,
    orderId,
    metadata: { orderNumber, riderName }
  })
}

export async function notifyOrderOnTheWay(orderId: string, buyerId: string, orderNumber: string, riderName: string) {
  await createNotification({
    userId: buyerId,
    type: 'ORDER_ON_THE_WAY',
    title: '🛵 Order On The Way!',
    message: `${riderName} is on the way with your order (#${orderNumber})`,
    orderId,
    metadata: { orderNumber, riderName }
  })
}

export async function notifyOrderDelivered(orderId: string, buyerId: string, orderNumber: string) {
  await createNotification({
    userId: buyerId,
    type: 'ORDER_DELIVERED',
    title: '✅ Order Delivered!',
    message: `Your order (#${orderNumber}) has been delivered. Please confirm receipt.`,
    orderId,
    metadata: { orderNumber }
  })
}

export async function notifyOrderCompleted(orderId: string, buyerId: string, sellerId: string, riderId: string | null, orderNumber: string, amount: number) {
  // Notify buyer
  await createNotification({
    userId: buyerId,
    type: 'ORDER_COMPLETED',
    title: '🎉 Order Completed!',
    message: `Order #${orderNumber} is complete. Don't forget to leave a review!`,
    orderId,
    metadata: { orderNumber, amount }
  })

  // Notify seller
  await createNotification({
    userId: sellerId,
    type: 'PAYMENT_RECEIVED',
    title: '💰 Payment Received!',
    message: `You've received ₦${amount.toFixed(2)} for order #${orderNumber}`,
    orderId,
    metadata: { orderNumber, amount }
  })

  // Notify rider if exists
  if (riderId) {
    await createNotification({
      userId: riderId,
      type: 'PAYMENT_RECEIVED',
      title: '💰 Delivery Payment!',
      message: `You've received payment for delivering order #${orderNumber}`,
      orderId,
      metadata: { orderNumber }
    })
  }
}

// ==========================================
// REVIEW NOTIFICATIONS
// ==========================================

export async function notifyProductReviewed(sellerId: string, productId: string, productName: string, rating: number, buyerName: string) {
  await createNotification({
    userId: sellerId,
    type: 'PRODUCT_REVIEWED',
    title: '⭐ New Product Review!',
    message: `${buyerName} left a ${rating}-star review for ${productName}`,
    productId,
    metadata: { productName, rating, buyerName }
  })
}

export async function notifySellerReviewed(sellerId: string, rating: number, buyerName: string, orderId: string) {
  await createNotification({
    userId: sellerId,
    type: 'SELLER_REVIEWED',
    title: '⭐ New Seller Review!',
    message: `${buyerName} gave you a ${rating}-star rating`,
    orderId,
    metadata: { rating, buyerName }
  })
}

export async function notifyRiderReviewed(riderId: string, rating: number, buyerName: string, orderId: string) {
  await createNotification({
    userId: riderId,
    type: 'RIDER_REVIEWED',
    title: '⭐ New Delivery Review!',
    message: `${buyerName} gave you a ${rating}-star rating`,
    orderId,
    metadata: { rating, buyerName }
  })
}

// ==========================================
// DISPUTE NOTIFICATIONS
// ==========================================

export async function notifyDisputeOpened(disputeId: string, sellerId: string, buyerName: string, orderNumber: string, orderId: string) {
  await createNotification({
    userId: sellerId,
    type: 'DISPUTE_OPENED',
    title: '⚠️ Dispute Opened',
    message: `${buyerName} opened a dispute for order #${orderNumber}`,
    orderId,
    disputeId,
    metadata: { orderNumber, buyerName }
  })
}

export async function notifyDisputeMessage(disputeId: string, recipientId: string, senderName: string, orderId: string) {
  await createNotification({
    userId: recipientId,
    type: 'DISPUTE_MESSAGE',
    title: '💬 New Dispute Message',
    message: `${senderName} sent a message in your dispute`,
    orderId,
    disputeId,
    metadata: { senderName }
  })
}

export async function notifyDisputeResolved(disputeId: string, buyerId: string, sellerId: string, resolution: string, orderNumber: string, orderId: string) {
  // Notify buyer
  await createNotification({
    userId: buyerId,
    type: 'DISPUTE_RESOLVED',
    title: '✅ Dispute Resolved',
    message: `Your dispute for order #${orderNumber} has been resolved: ${resolution}`,
    orderId,
    disputeId,
    metadata: { orderNumber, resolution }
  })

  // Notify seller
  await createNotification({
    userId: sellerId,
    type: 'DISPUTE_RESOLVED',
    title: '✅ Dispute Resolved',
    message: `Dispute for order #${orderNumber} has been resolved: ${resolution}`,
    orderId,
    disputeId,
    metadata: { orderNumber, resolution }
  })
}

// ==========================================
// REPORT NOTIFICATIONS
// ==========================================

export async function notifyReportSubmitted(reportId: string, reportedUserId: string, reporterName: string, reportType: string) {
  await createNotification({
    userId: reportedUserId,
    type: 'REPORT_SUBMITTED',
    title: '⚠️ Report Filed',
    message: `A report has been filed against you. Our team is reviewing it.`,
    reportId,
    metadata: { reportType }
  })
}

export async function notifyReportResolved(reportId: string, reporterId: string, reportedUserId: string | null, resolution: string) {
  // Notify reporter
  await createNotification({
    userId: reporterId,
    type: 'REPORT_RESOLVED',
    title: '✅ Report Resolved',
    message: `Your report has been reviewed: ${resolution}`,
    reportId,
    metadata: { resolution }
  })

  // Notify reported user if applicable
  if (reportedUserId) {
    await createNotification({
      userId: reportedUserId,
      type: 'REPORT_RESOLVED',
      title: '✅ Report Resolved',
      message: `The report against you has been resolved: ${resolution}`,
      reportId,
      metadata: { resolution }
    })
  }
}

// ==========================================
// PENALTY NOTIFICATIONS
// ==========================================

export async function notifyPenaltyIssued(userId: string, penaltyAction: string, reason: string, points: number) {
  await createNotification({
    userId,
    type: 'PENALTY_ISSUED',
    title: '⚠️ Penalty Issued',
    message: `You received a penalty: ${penaltyAction}. ${points} penalty points added. Reason: ${reason}`,
    metadata: { penaltyAction, reason, points }
  })
}

// ==========================================
// REPLACED FUNCTION - NOW SUPPORTS PERMANENT SUSPENSION
// ==========================================

export async function notifyAccountSuspended(userId: string, until: Date | null, reason: string) {
  const message = until
    ? `Your account has been suspended until ${until.toLocaleDateString()}. Reason: ${reason}`
    : `Your account has been permanently suspended. Reason: ${reason}. Contact support@bata.ng to appeal.`

  await createNotification({
    userId,
    type: 'ACCOUNT_SUSPENDED',
    title: '🚫 Account Suspended',
    message,
    metadata: { until: until?.toISOString() ?? 'permanent', reason }
  })
}

export async function notifyAccountUnsuspended(userId: string) {
  await createNotification({
    userId,
    type: 'ACCOUNT_UNSUSPENDED',
    title: '✅ Account Restored',
    message: `Your account suspension has been lifted. Welcome back!`,
    metadata: {}
  })
}

// ==========================================
// WALLET NOTIFICATIONS
// ==========================================

export async function notifyWithdrawalProcessed(userId: string, amount: number, reference: string) {
  await createNotification({
    userId,
    type: 'WITHDRAWAL_PROCESSED',
    title: '💸 Withdrawal Processed',
    message: `Your withdrawal of ₦${amount.toFixed(2)} has been processed successfully`,
    metadata: { amount, reference }
  })
}