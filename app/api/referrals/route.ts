// app/api/referrals/route.ts
// Returns the current user's referral stats for the dashboard

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [referrals, rewards] = await Promise.all([
      // All users this person referred
      prisma.user.findMany({
        where: { referredById: user.id },
        select: {
          id:        true,
          name:      true,
          createdAt: true,
          // Count completed orders by each referred user
          orders: {
            where:  { status: 'COMPLETED' },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // All rewards earned by this referrer
      prisma.referralReward.findMany({
        where:   { referrerId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNumber: true, totalAmount: true, completedAt: true } },
        },
      }),
    ])

    const totalEarnings      = rewards.reduce((sum, r) => sum + r.amount, 0)
    const totalReferrals     = referrals.length
    const totalReferralOrders = referrals.reduce((sum, u) => sum + u.orders.length, 0)

    return NextResponse.json({
      referralCode: (user as any).referralCode,   // available after migration
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/signup?ref=${(user as any).referralCode}`,
      totalReferrals,
      totalEarnings,
      totalReferralOrders,
      referrals: referrals.map(r => ({
        id:             r.id,
        name:           r.name,
        joinedAt:       r.createdAt,
        completedOrders: r.orders.length,
      })),
      recentRewards: rewards.slice(0, 20).map(r => ({
        id:          r.id,
        amount:      r.amount,
        orderNumber: r.order.orderNumber,
        orderAmount: r.order.totalAmount,
        earnedAt:    r.createdAt,
      })),
    })
  } catch (error) {
    console.error('Referral stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch referral data' }, { status: 500 })
  }
}