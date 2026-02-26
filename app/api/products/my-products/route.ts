// app/api/products/my-products/route.ts

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

    // Fetch all products by this seller (including out of stock)
    const products = await prisma.product.findMany({
      where: {
        sellerId: user.id,
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ 
      success: true, 
      products,
      stats: {
        total: products.length,
        active: products.filter(p => p.isActive && p.quantity > 0).length,
        outOfStock: products.filter(p => p.quantity === 0).length,
        inactive: products.filter(p => !p.isActive).length,
      },
    })
  } catch (error) {
    console.error('Fetch my products error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}