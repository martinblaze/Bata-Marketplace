// app/api/admin/referrals/route.ts
// Extends admin analytics with referral metrics

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Basic admin auth check (reuse your existing pattern)
    const adminToken = request.headers.get('x-admin-token')
    if (adminToken !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [
      totalReferralUsers,
      totalRewardsPaid,
      topReferrers,
      recentRewards,
    ] = await Promise.all([
      // Users who were referred
      prisma.user.count({ where: { referredById: { not: null } } }),

      // Total amount paid in referral rewards
      prisma.referralReward.aggregate({ _sum: { amount: true } }),

      // Top 10 referrers by earnings
      prisma.referralReward.groupBy({
        by:      ['referrerId'],
        _sum:    { amount: true },
        _count:  { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take:    10,
      }),

      // Recent 20 rewards
      prisma.referralReward.findMany({
        take:    20,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer:    { select: { name: true, email: true } },
          referredUser: { select: { name: true } },
          order:       { select: { orderNumber: true, totalAmount: true } },
        },
      }),
    ])

    // Enrich top referrers with names
    const referrerIds = topReferrers.map(r => r.referrerId)
    const referrerUsers = await prisma.user.findMany({
      where:  { id: { in: referrerIds } },
      select: { id: true, name: true, email: true },
    })
    const referrerMap = Object.fromEntries(referrerUsers.map(u => [u.id, u]))

    return NextResponse.json({
      metrics: {
        totalReferralUsers,
        totalRewardsPaid:  totalRewardsPaid._sum.amount || 0,
        totalRewardCount:  await prisma.referralReward.count(),
      },
      topReferrers: topReferrers.map(r => ({
        referrerId:    r.referrerId,
        name:          referrerMap[r.referrerId]?.name  || 'Unknown',
        email:         referrerMap[r.referrerId]?.email || '',
        totalEarned:   r._sum.amount || 0,
        totalReferrals: r._count.id,
      })),
      recentRewards: recentRewards.map(r => ({
        id:              r.id,
        referrer:        r.referrer.name,
        referredUser:    r.referredUser.name,
        orderNumber:     r.order.orderNumber,
        orderAmount:     r.order.totalAmount,
        rewardAmount:    r.amount,
        earnedAt:        r.createdAt,
      })),
    })
  } catch (error) {
    console.error('Admin referral analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch referral analytics' }, { status: 500 })
  }
}