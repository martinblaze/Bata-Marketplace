import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch faceDescriptor separately (getUserFromRequest may not select it)
    const faceRow = await prisma.user.findUnique({
      where: { id: user.id },
      select: { faceDescriptor: true },
    })

    return NextResponse.json({
      user: {
        // Basic Info
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        matricNumber: user.matricNumber,
        profilePhoto: user.profilePhoto,
        
        // Role & Mode
        role: user.role,
        
        // Location
        hostelName: user.hostelName,
        roomNumber: user.roomNumber,
        landmark: user.landmark,
        
        // Trust & Ratings
        trustLevel: user.trustLevel,
        rating: user.avgRating,
        totalRatings: user.totalReviews,
        completedOrders: user.completedOrders,
        
        // Wallet
        pendingBalance: user.pendingBalance,
        availableBalance: user.availableBalance,
        
        // Penalty System
        penaltyPoints: user.penaltyPoints,
        isSuspended: user.isSuspended,
        suspendedUntil: user.suspendedUntil,
        
        // Rider Specific
        isRiderVerified: user.isRiderVerified,
        isAvailable: user.isAvailable,
        
        // Timestamps
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        // ✅ Face ID status — used by wallet page for upfront check
        hasFaceId: !!faceRow?.faceDescriptor,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 })
  }
}