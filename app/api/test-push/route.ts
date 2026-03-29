import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    vapidEmail: process.env.VAPID_EMAIL,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    hasPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
  })
}