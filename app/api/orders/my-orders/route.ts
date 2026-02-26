import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { OrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Helper function to get user from JWT token
async function getUserFromToken(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return user
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

// Helper to check if order can be disputed
function checkDisputeEligibility(order: any) {
  // Check if order already has a dispute
  if (order.dispute) {
    return {
      canDispute: false,
      reason: 'Already has an active dispute',
      debug: { hasDispute: true, disputeStatus: order.dispute.status }
    }
  }

  // Check if order status allows disputes
  const disputableStatuses = [
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
    OrderStatus.ON_THE_WAY,
    OrderStatus.PICKED_UP,
    OrderStatus.RIDER_ASSIGNED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED
  ]

  if (!disputableStatuses.includes(order.status)) {
    return {
      canDispute: false,
      reason: `Order status "${order.status}" cannot be disputed`,
      debug: { status: order.status, allowedStatuses: disputableStatuses }
    }
  }

  // For delivered/completed orders, check delivery date and 7-day window
  if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.COMPLETED) {
    // Use completedAt if deliveredAt is not available
    const deliveryDate = order.deliveredAt || order.completedAt;
    
    // Check if order has a delivery/completion date
    if (!deliveryDate) {
      return {
        canDispute: false,
        reason: 'Order has no delivery or completion date',
        debug: { 
          deliveredAt: order.deliveredAt, 
          completedAt: order.completedAt,
          status: order.status 
        }
      }
    }

    // Check if within 7 days of delivery/completion
    const deliveredDate = new Date(deliveryDate)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    if (deliveredDate <= sevenDaysAgo) {
      const daysAgo = Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        canDispute: false,
        reason: `Dispute window expired (${order.status.toLowerCase()} ${daysAgo} days ago)`,
        debug: { 
          deliveryDate: deliveredDate, 
          sevenDaysAgo, 
          daysAgo,
          dateFieldUsed: order.deliveredAt ? 'deliveredAt' : 'completedAt'
        }
      }
    }
  }

  // For in-transit orders, allow disputes
  if ([OrderStatus.ON_THE_WAY, OrderStatus.PICKED_UP, OrderStatus.RIDER_ASSIGNED].includes(order.status)) {
    return {
      canDispute: true,
      reason: 'Order is in transit and can be disputed',
      debug: { status: order.status, inTransit: true }
    }
  }

  // For processing/shipped orders, allow disputes
  if ([OrderStatus.PROCESSING, OrderStatus.SHIPPED].includes(order.status)) {
    return {
      canDispute: true,
      reason: 'Order is processing/shipped and can be disputed',
      debug: { status: order.status, processing: true }
    }
  }

  // All checks passed for delivered/completed within 7 days
  return {
    canDispute: true,
    reason: 'Eligible for dispute',
    debug: { 
      status: order.status, 
      deliveredAt: order.deliveredAt,
      completedAt: order.completedAt,
      within7Days: true 
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get user from JWT token
    const user = await getUserFromToken(req)

    if (!user?.id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized. Please login.' 
        },
        { status: 401 }
      )
    }

    console.log(`🔍 Fetching orders for user: ${user.id} (${user.name || user.email})`)

    // Fetch ALL orders where the user is the buyer
    const orders = await prisma.order.findMany({
      where: {
        buyerId: user.id,
        // Exclude cancelled orders only
        status: {
          not: OrderStatus.CANCELLED
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            price: true,
            seller: {
              select: {
                id: true,
                name: true,
                profilePhoto: true,
                avgRating: true,
                totalReviews: true,
                trustLevel: true,
              }
            }
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            email: true,
            avgRating: true,
            totalReviews: true,
            trustLevel: true,
          }
        },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            profilePhoto: true,
            email: true,
            avgRating: true,
            totalReviews: true,
            trustLevel: true,
          }
        },
        dispute: {
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📦 Found ${orders.length} orders for user ${user.id}`)
    
    // Format orders with detailed dispute eligibility info
    const formattedOrders = orders.map(order => {
      const eligibility = checkDisputeEligibility(order)
      
      // Log each order's status for debugging
      console.log(`  Order ${order.id.substring(0, 8)}:`, {
        status: order.status,
        deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'N/A',
        completedAt: order.completedAt ? new Date(order.completedAt).toLocaleDateString() : 'N/A',
        pickedUpAt: order.pickedUpAt ? new Date(order.pickedUpAt).toLocaleDateString() : 'N/A',
        hasDispute: !!order.dispute,
        canDispute: eligibility.canDispute,
        reason: eligibility.reason
      })

      return {
        id: order.id,
        orderNumber: order.orderNumber || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
        totalAmount: order.totalAmount,
        product: {
          name: order.product.name,
          images: order.product.images,
          price: order.product.price,
        },
        seller: {
          name: order.seller.name,
          rating: order.seller.avgRating || 0,
          trustLevel: order.seller.trustLevel || 'BRONZE',
        },
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString(),
        pickedUpAt: order.pickedUpAt?.toISOString(),
        completedAt: order.completedAt?.toISOString(),
        canDispute: eligibility.canDispute,
        disputeReason: eligibility.reason,
        hasExistingDispute: !!order.dispute,
        existingDisputeStatus: order.dispute?.status,
        // Include debug info in development
        ...(process.env.NODE_ENV === 'development' && { debug: eligibility.debug })
      }
    })

    // Calculate statistics
    const eligibleOrders = formattedOrders.filter(o => o.canDispute)
    const disputedOrders = formattedOrders.filter(o => o.hasExistingDispute)
    
    const stats = {
      total: formattedOrders.length,
      eligibleForDispute: eligibleOrders.length,
      alreadyDisputed: disputedOrders.length,
      byStatus: formattedOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    console.log('📊 Order Statistics:', {
      totalOrders: stats.total,
      eligibleForDispute: stats.eligibleForDispute,
      alreadyDisputed: stats.alreadyDisputed,
      statusBreakdown: stats.byStatus
    })

    return NextResponse.json({ 
      success: true,
      orders: formattedOrders,
      stats,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
    
  } catch (error) {
    console.error('❌ Error fetching orders:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch orders. Please try again later.',
        debug: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
      },
      { status: 500 }
    )
  }
}