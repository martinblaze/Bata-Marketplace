// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

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
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '7days'

    let startDate = new Date()
    if (range === '7days') startDate.setDate(startDate.getDate() - 7)
    else if (range === '30days') startDate.setDate(startDate.getDate() - 30)
    else if (range === '90days') startDate.setDate(startDate.getDate() - 90)
    else startDate = new Date(0)

    const [newUsers, newProducts, totalOrders, revenue, topCategories] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.product.count({ where: { createdAt: { gte: startDate } } }),
      prisma.order.count({ where: { createdAt: { gte: startDate } } }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED'
        },
        _sum: { totalAmount: true }
      }),
      prisma.product.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 5
      })
    ])

    return NextResponse.json({
      analytics: {
        newUsers,
        newProducts,
        totalOrders,
        revenue: revenue._sum.totalAmount || 0,
        totalProducts: await prisma.product.count(),
        topCategories: topCategories.map(c => ({ category: c.category, count: c._count }))
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}