// app/api/test-push/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push/sendPushNotification'

export async function GET() {
  const subscriptions = await prisma.pushSubscription.findMany({ take: 1 })
  if (!subscriptions.length) return NextResponse.json({ error: 'No subscriptions found' })

  await sendPushToUser(subscriptions[0].userId, {
    title: 'BataMart Test 🔥',
    message: 'Push notifications are working!',
    url: '/orders'
  })

  return NextResponse.json({ success: true })
}