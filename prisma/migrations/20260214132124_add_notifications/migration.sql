-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_PLACED', 'ORDER_PROCESSING', 'RIDER_ASSIGNED', 'ORDER_PICKED_UP', 'ORDER_ON_THE_WAY', 'ORDER_DELIVERED', 'ORDER_COMPLETED', 'ORDER_DISPUTED', 'ORDER_CANCELLED', 'PRODUCT_REVIEWED', 'SELLER_REVIEWED', 'RIDER_REVIEWED', 'DISPUTE_OPENED', 'DISPUTE_MESSAGE', 'DISPUTE_RESOLVED', 'REPORT_SUBMITTED', 'REPORT_RESOLVED', 'PENALTY_ISSUED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_UNSUSPENDED', 'WITHDRAWAL_PROCESSED', 'PAYMENT_RECEIVED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "orderId" TEXT,
    "productId" TEXT,
    "disputeId" TEXT,
    "reportId" TEXT,
    "reviewId" TEXT,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
