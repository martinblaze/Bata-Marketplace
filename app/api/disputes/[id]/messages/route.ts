export const dynamic = 'force-dynamic'
// app/api/disputes/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { notifyDisputeMessage } from '@/lib/notification'

async function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    return await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, role: true },
    })
  } catch {
    return null
  }
}

// GET: Fetch all messages for a dispute (buyer or admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: disputeId } = params

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      select: { id: true, buyerId: true },
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Only buyer or admin can access messages
    const isAllowed = user.id === dispute.buyerId || user.role === 'ADMIN'
    if (!isAllowed) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const messages = await prisma.disputeMessage.findMany({
      where: {
        disputeId,
        // Exclude any legacy SELLER messages from the chat view
        senderType: { in: ['BUYER', 'ADMIN'] },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, messages, count: messages.length })
  } catch (error) {
    console.error('Error fetching dispute messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST: Add message (buyer or admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: disputeId } = params
    const body = await req.json()
    const { message, attachments = [] } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true },
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Only buyer or admin can send messages
    const isBuyer = user.id === dispute.buyerId
    const isAdmin = user.role === 'ADMIN'

    if (!isBuyer && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const senderType = isAdmin ? 'ADMIN' : 'BUYER'

    // Notify the other party:
    // - if buyer sends → notify admin (no specific userId, handled by admin panel polling)
    // - if admin sends → notify buyer
    const notifyUserId = isAdmin ? dispute.buyerId : null

    const disputeMessage = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.disputeMessage.create({
        data: {
          disputeId,
          senderId: user.id,
          senderType,
          message: message.trim(),
          attachments,
        },
      })

      // If admin is sending first reply, move status to UNDER_REVIEW
      if (isAdmin && dispute.status === 'OPEN') {
        await tx.dispute.update({
          where: { id: disputeId },
          data: { status: 'UNDER_REVIEW' },
        })
      }

      // Notify buyer when admin replies
      if (notifyUserId) {
        await notifyDisputeMessage(
          disputeId,
          notifyUserId,
          'Support Team',
          dispute.orderId
        )
      }

      return newMessage
    })

    return NextResponse.json({ success: true, message: disputeMessage })
  } catch (error) {
    console.error('Error adding dispute message:', error)
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
  }
}