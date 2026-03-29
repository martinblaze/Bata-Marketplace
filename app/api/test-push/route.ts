// app/api/test-push/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push/sendPushNotification'

export async function GET() {
  // Delete the two old FCM subscriptions from March 11 & 21
  await prisma.pushSubscription.deleteMany({
    where: {
      createdAt: {
        lt: new Date('2026-03-25T00:00:00.000Z')
      }
    }
  })

  // Now send to all remaining fresh subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ['userId'],
  })

  const results = await Promise.allSettled(
    subscriptions.map(({ userId }) =>
      sendPushToUser(userId, {
        title: 'BataMart 🔥',
        message: 'Push notifications are live!',
        url: '/marketplace',
      })
    )
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length

  return NextResponse.json({ total: subscriptions.length, succeeded })
}