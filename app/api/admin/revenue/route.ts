// app/api/admin/revenue/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'ADMIN') return null
    return decoded
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // This month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Today
    const todayStart = new Date(now.setHours(0, 0, 0, 0))

    const [
      allTimeOrders,
      thisMonthOrders,
      lastMonthOrders,
      todayOrders,
      pendingOrders,
      topSellersRaw,
      totalSellersBalance,
      totalRidersBalance,
    ] = await Promise.all([
      // All completed orders
      prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true, platformCommission: true, deliveryFee: true },
        _count: true,
      }),

      // This month completed
      prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: thisMonthStart } },
        _sum: { totalAmount: true, platformCommission: true },
        _count: true,
      }),

      // Last month completed
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { totalAmount: true, platformCommission: true },
        _count: true,
      }),

      // Today completed
      prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: todayStart } },
        _sum: { totalAmount: true, platformCommission: true },
        _count: true,
      }),

      // Pending escrow (orders not yet completed)
      prisma.order.aggregate({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, isPaid: true },
        _sum: { totalAmount: true, platformCommission: true },
        _count: true,
      }),

      // Top sellers
      prisma.order.groupBy({
        by: ['sellerId'],
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true, platformCommission: true },
        _count: true,
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10,
      }),

      // Total pending balance owed to sellers
      prisma.user.aggregate({
        where: { role: 'SELLER' },
        _sum: { pendingBalance: true, availableBalance: true },
      }),

      // Total pending balance owed to riders
      prisma.user.aggregate({
        where: { role: 'RIDER' },
        _sum: { pendingBalance: true, availableBalance: true },
      }),
    ])

    // Enrich top sellers with names
    const topSellers = await Promise.all(
      topSellersRaw.map(async (s) => {
        const seller = await prisma.user.findUnique({
          where: { id: s.sellerId },
          select: { name: true, email: true },
        })
        return {
          name: seller?.name || 'Unknown',
          email: seller?.email || '',
          totalRevenue: s._sum.totalAmount || 0,
          platformEarned: s._sum.platformCommission || 0,
          totalOrders: s._count,
        }
      })
    )

    // ── Paystack fee calculation helper ───────────────────
    // Paystack charges 1.5% + ₦100 per transaction, capped at ₦2,000
    const calculatePaystackFee = (amount: number): number => {
      const fee = amount * 0.015 + 100
      return Math.min(fee, 2000) // cap at ₦2,000
    }

    // Calculate total Paystack fees
    const allTimePaystackFees = (allTimeOrders._sum.totalAmount || 0) > 0 
      ? calculatePaystackFee(allTimeOrders._sum.totalAmount || 0) * allTimeOrders._count
      : 0

    const thisMonthPaystackFees = (thisMonthOrders._sum.totalAmount || 0) > 0
      ? calculatePaystackFee(thisMonthOrders._sum.totalAmount || 0 / Math.max(thisMonthOrders._count, 1)) * thisMonthOrders._count
      : 0

    const lastMonthPaystackFees = (lastMonthOrders._sum.totalAmount || 0) > 0
      ? calculatePaystackFee(lastMonthOrders._sum.totalAmount || 0 / Math.max(lastMonthOrders._count, 1)) * lastMonthOrders._count
      : 0

    const todayPaystackFees = (todayOrders._sum.totalAmount || 0) > 0
      ? calculatePaystackFee(todayOrders._sum.totalAmount || 0 / Math.max(todayOrders._count, 1)) * todayOrders._count
      : 0

    const pendingPaystackFees = (pendingOrders._sum.totalAmount || 0) > 0
      ? calculatePaystackFee(pendingOrders._sum.totalAmount || 0 / Math.max(pendingOrders._count, 1)) * pendingOrders._count
      : 0

    // ── Platform earnings calculation ──────────────────────
    // Gross = what's stored in DB (before Paystack fees)
    const grossPlatformAllTime = allTimeOrders._sum.platformCommission || 0
    const grossPlatformThisMonth = thisMonthOrders._sum.platformCommission || 0
    const grossPlatformLastMonth = lastMonthOrders._sum.platformCommission || 0
    const grossPlatformToday = todayOrders._sum.platformCommission || 0
    const grossPlatformPending = pendingOrders._sum.platformCommission || 0

    // Net = gross minus Paystack fees (your actual profit)
    const netPlatformAllTime = grossPlatformAllTime - allTimePaystackFees
    const netPlatformThisMonth = grossPlatformThisMonth - thisMonthPaystackFees
    const netPlatformLastMonth = grossPlatformLastMonth - lastMonthPaystackFees
    const netPlatformToday = grossPlatformToday - todayPaystackFees
    const netPlatformPending = grossPlatformPending - pendingPaystackFees

    // Total owed to sellers (available = can withdraw now, pending = in escrow)
    const totalOwedToSellers =
      (totalSellersBalance._sum.availableBalance || 0) +
      (totalSellersBalance._sum.pendingBalance || 0)

    // Total owed to riders
    const totalOwedToRiders =
      (totalRidersBalance._sum.availableBalance || 0) +
      (totalRidersBalance._sum.pendingBalance || 0)

    // What's sitting in Paystack right now (approximate)
    // = all paid order amounts - what's already been withdrawn (simplified)
    const totalPaidIn = allTimeOrders._sum.totalAmount || 0
    const paystackBalance = totalPaidIn // Paystack holds everything until withdrawal

    return NextResponse.json({
      revenue: {
        // ── Overall ────────────────────────────────────────
        totalRevenue: allTimeOrders._sum.totalAmount || 0,
        totalOrders: allTimeOrders._count,

        // ── Your platform profit ───────────────────────────
        platform: {
          gross: {
            allTime: grossPlatformAllTime,
            thisMonth: grossPlatformThisMonth,
            lastMonth: grossPlatformLastMonth,
            today: grossPlatformToday,
            pending: grossPlatformPending,
          },
          net: {
            allTime: netPlatformAllTime,
            thisMonth: netPlatformThisMonth,
            lastMonth: netPlatformLastMonth,
            today: netPlatformToday,
            pending: netPlatformPending,
          },
          paystackFees: {
            allTime: allTimePaystackFees,
            thisMonth: thisMonthPaystackFees,
            lastMonth: lastMonthPaystackFees,
            today: todayPaystackFees,
            pending: pendingPaystackFees,
          },
        },

        // ── Period breakdowns ──────────────────────────────
        thisMonth: {
          revenue: thisMonthOrders._sum.totalAmount || 0,
          orders: thisMonthOrders._count,
          platformEarned: grossPlatformThisMonth,
        },
        lastMonth: {
          revenue: lastMonthOrders._sum.totalAmount || 0,
          orders: lastMonthOrders._count,
          platformEarned: grossPlatformLastMonth,
        },
        today: {
          revenue: todayOrders._sum.totalAmount || 0,
          orders: todayOrders._count,
          platformEarned: grossPlatformToday,
        },

        // ── Escrow status ──────────────────────────────────
        escrow: {
          pendingOrders: pendingOrders._count,
          totalInEscrow: pendingOrders._sum.totalAmount || 0,
          yourCutInEscrow: grossPlatformPending,
        },

        // ── Obligations ────────────────────────────────────
        obligations: {
          totalOwedToSellers,
          totalOwedToRiders,
          sellersAvailableNow: totalSellersBalance._sum.availableBalance || 0,
          ridersAvailableNow: totalRidersBalance._sum.availableBalance || 0,
        },

        // ── Top sellers ────────────────────────────────────
        topSellers,
      },
    })
  } catch (error) {
    console.error('Revenue fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 })
  }
}