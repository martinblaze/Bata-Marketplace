// app/api/disputes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

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

// GET: Fetch single dispute details
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

    // Fetch dispute with all related data
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                price: true
              }
            }
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePhoto: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePhoto: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Check if user is involved in this dispute or is admin
    const isInvolved = 
      user.id === dispute.buyerId || 
      user.id === dispute.sellerId ||
      user.role === 'ADMIN'

    if (!isInvolved) {
      return NextResponse.json({ 
        error: 'Not authorized to view this dispute' 
      }, { status: 403 })
    }

    return NextResponse.json({ 
      success: true,
      dispute 
    })
  } catch (error) {
    console.error('Error fetching dispute:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch dispute',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}