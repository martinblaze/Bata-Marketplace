// app/api/test-push/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import webpush from 'web-push'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET() {
  const subscriptions = await prisma.pushSubscription.findMany()

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: 'BataMart Test 🔥', body: 'Working!', url: '/' })
        )
        return { ok: true, endpoint: sub.endpoint.slice(0, 50) }
      } catch (err: any) {
        return { ok: false, endpoint: sub.endpoint.slice(0, 50), status: err.statusCode, body: err.body }
      }
    })
  )

  return NextResponse.json(results.map(r => r.status === 'fulfilled' ? r.value : r.reason))
}