export const dynamic = 'force-dynamic'
// app/api/disputes/route.ts - WITH NOTIFICATIONS
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { notifyDisputeOpened } from '@/lib/notification'

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

// GET: Fetch user's disputes
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const disputes = await prisma.dispute.findMany({
      where: {
        OR: [
          { buyerId: user.id },
          { sellerId: user.id }
        ]
      },
      include: {
        order: {
          include: {
            product: {
              select: { id: true, name: true, images: true }
            }
          }
        },
        buyer: {
          select: { id: true, name: true, profilePhoto: true }
        },
        seller: {
          select: { id: true, name: true, profilePhoto: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ disputes })
  } catch (error) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 })
  }
}

// POST: Create a new dispute
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { orderId, reason, evidence = [] } = body

    // Validation
    if (!orderId || !reason) {
      return NextResponse.json({ 
        error: 'Order ID and reason are required' 
      }, { status: 400 })
    }

    // Check if order exists and user is the buyer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        dispute: true // Check if dispute already exists
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.buyerId !== user.id) {
      return NextResponse.json({ 
        error: 'Only the buyer can open a dispute' 
      }, { status: 403 })
    }

    if (order.dispute) {
      return NextResponse.json({ 
        error: 'A dispute already exists for this order' 
      }, { status: 400 })
    }

    // Only allow disputes for completed/delivered orders
    if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
      return NextResponse.json({ 
        error: 'Can only dispute delivered or completed orders' 
      }, { status: 400 })
    }

    // Create dispute, mark order, and send notification in transaction
    const dispute = await prisma.$transaction(async (tx) => {
      // Create dispute
      const newDispute = await tx.dispute.create({
        data: {
          orderId: order.id,
          buyerId: user.id,
          sellerId: order.sellerId,
          reason,
          buyerEvidence: evidence,
          status: 'OPEN'
        },
        include: {
          order: {
            include: {
              product: true
            }
          },
          buyer: {
            select: { id: true, name: true }
          },
          seller: {
            select: { id: true, name: true }
          }
        }
      })

      // Mark order as disputed
      await tx.order.update({
        where: { id: orderId },
        data: { isDisputed: true }
      })

      // Create initial message from buyer
      await tx.disputeMessage.create({
        data: {
          disputeId: newDispute.id,
          senderId: user.id,
          senderType: 'BUYER',
          message: reason,
          attachments: evidence
        }
      })

      // ✅ NOTIFICATION: Notify seller that buyer opened a dispute
      // Signature: notifyDisputeOpened(disputeId, sellerId, buyerName, orderNumber, orderId)
      await notifyDisputeOpened(
        newDispute.id,
        order.sellerId,
        user.name || 'A buyer',
        order.orderNumber,
        order.id
      )

      return newDispute
    })

    return NextResponse.json({ 
      success: true,
      dispute,
      message: 'Dispute opened successfully' 
    })
  } catch (error) {
    console.error('Error creating dispute:', error)
    return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 })
  }
}
