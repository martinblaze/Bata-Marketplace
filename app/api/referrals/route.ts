// app/api/referrals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Fetch referralCode separately since getUserFromRequest doesn't select it
    const fullUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, referralCode: true },
    })

    if (!fullUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const [referrals, rewards] = await Promise.all([
      prisma.user.findMany({
        where: { referredById: fullUser.id },
        select: {
          id:        true,
          name:      true,
          createdAt: true,
          orders: {
            where:  { status: 'COMPLETED' },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      prisma.referralReward.findMany({
        where:   { referrerId: fullUser.id },
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNumber: true, totalAmount: true, completedAt: true } },
        },
      }),
    ])

    const totalEarnings       = rewards.reduce((sum, r) => sum + r.amount, 0)
    const totalReferrals      = referrals.length
    const totalReferralOrders = referrals.reduce((sum, u) => sum + u.orders.length, 0)

    return NextResponse.json({
      referralCode: fullUser.referralCode, // ✅ correctly fetched
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/signup?ref=${fullUser.referralCode}`,
      totalReferrals,
      totalEarnings,
      totalReferralOrders,
      referrals: referrals.map(r => ({
        id:              r.id,
        name:            r.name,
        joinedAt:        r.createdAt,
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