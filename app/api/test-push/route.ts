// app/api/test-push/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push/sendPushNotification'

export async function GET() {
  // Get all unique users that have subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ['userId'],
  })

  if (!subscriptions.length) {
    return NextResponse.json({ error: 'No subscriptions in DB' })
  }

  const results = await Promise.allSettled(
    subscriptions.map(({ userId }) =>
      sendPushToUser(userId, {
        title: 'BataMart 🔥',
        message: 'Push notifications are live! You\'ll now get order and payment alerts.',
        url: '/marketplace',
      })
    )
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length

  return NextResponse.json({
    total: subscriptions.length,
    succeeded,
    failed: subscriptions.length - succeeded,
  })
}