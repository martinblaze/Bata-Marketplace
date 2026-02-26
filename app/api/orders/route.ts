// app/api/orders/route.ts - WITH NOTIFICATIONS
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import { notifyOrderPlaced } from '@/lib/notification'

export const dynamic = 'force-dynamic'

// GET user's orders
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: { buyerId: user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            price: true,
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePhoto: true,
            avgRating: true,
            trustLevel: true,
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        productReviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          }
        },
        reviews: {
          select: {
            id: true,
            type: true,
            rating: true,
            comment: true,
            createdAt: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formattedOrders = orders.map(order => ({
      ...order,
      deliveryAddress: `${order.deliveryHostel}, Room ${order.deliveryRoom}${order.deliveryLandmark ? `, ${order.deliveryLandmark}` : ''}`,
      isPaid: order.status === 'COMPLETED',
    }))

    return NextResponse.json({ orders: formattedOrders })
  } catch (error) {
    console.error('Fetch orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// POST create order
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, quantity } = body

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check stock
    if (product.quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
    }

    // Can't buy own product
    if (product.sellerId === user.id) {
      return NextResponse.json({ error: 'Cannot buy your own product' }, { status: 400 })
    }

    const deliveryFee = 800
    const totalAmount = product.price * quantity + deliveryFee

    // Generate order number
    const orderNumber = `BATA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        buyerId: user.id,
        sellerId: product.sellerId,
        productId: product.id,
        totalAmount,
        deliveryFee,
        platformCommission: product.price * 0.1,
        quantity,
        productPrice: product.price,
        deliveryHostel: user.hostelName || '',
        deliveryRoom: user.roomNumber || '',
        deliveryLandmark: user.landmark || '',
        deliveryPhone: user.phone || '',
      },
    })

    // ✅ NOTIFICATION: Notify seller of new order
    await notifyOrderPlaced(
      order.id,
      user.id,
      product.sellerId,
      orderNumber,
      product.name
    )

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}