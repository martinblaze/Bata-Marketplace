// app/api/orders/seller-orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  
  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    return await prisma.user.findUnique({ 
      where: { id: decoded.userId },
      select: { id: true, name: true, phone: true, role: true }
    })
  } catch (error) {
    return null
  }
}

// GET: Fetch seller's orders
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all orders where this user is the seller
    const orders = await prisma.order.findMany({
      where: {
        sellerId: user.id
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            price: true
          }
        },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        dispute: {
          select: {
            id: true,
            status: true,
            reason: true,
            createdAt: true,
            buyerEvidence: true,
            sellerEvidence: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ 
      success: true,
      orders,
      count: orders.length
    })
  } catch (error) {
    console.error('Error fetching seller orders:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}