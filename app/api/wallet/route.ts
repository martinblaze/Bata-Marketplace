// app/api/wallet/route.ts
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

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        availableBalance: true,
        pendingBalance: true,
        role: true,
      },
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Count completed orders directly from orders table — accurate regardless
    // of whether the completedOrders counter was incremented correctly
    let completedOrders = 0

    if (userData.role === 'SELLER') {
      completedOrders = await prisma.order.count({
        where: {
          sellerId: user.id,
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
      })
    } else if (userData.role === 'RIDER') {
      completedOrders = await prisma.order.count({
        where: {
          riderId: user.id,
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
      })
    } else {
      // BUYER
      completedOrders = await prisma.order.count({
        where: {
          buyerId: user.id,
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
      })
    }

    return NextResponse.json({
      wallet: {
        availableBalance: Math.max(0, userData.availableBalance),
        pendingBalance: Math.max(0, userData.pendingBalance),
        completedOrders,
        role: userData.role,
      },
    })
  } catch (error) {
    console.error('Fetch wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wallet data' },
      { status: 500 }
    )
  }
}