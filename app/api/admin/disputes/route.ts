// app/api/admin/disputes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, name: true }
    })
    
    if (!user || user.role !== 'ADMIN') return null
    return user
  } catch {
    return null
  }
}

// GET: Fetch all disputes for admin
export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access only' }, { status: 401 })
    }

    // Get status filter from query params
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    // Build where clause
    const whereClause: any = {}
    
    if (statusFilter && statusFilter !== 'ALL') {
      // Map frontend status to database status
      if (statusFilter === 'PENDING') {
        whereClause.status = 'OPEN'
      } else {
        whereClause.status = statusFilter
      }
    }

    // Fetch disputes with all related data
    const disputes = await prisma.dispute.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            product: {
              select: {
                id: true,
                name: true,
                images: true
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
          orderBy: { createdAt: 'asc' },
          include: {
            dispute: {
              select: {
                buyerId: true,
                sellerId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform the data to match frontend expectations
    const transformedDisputes = disputes.map(dispute => ({
      ...dispute,
      status: dispute.status === 'OPEN' ? 'PENDING' : dispute.status
    }))

    return NextResponse.json({ 
      success: true,
      disputes: transformedDisputes,
      count: transformedDisputes.length
    })
  } catch (error) {
    console.error('Error fetching admin disputes:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch disputes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}