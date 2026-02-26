import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        rating: user.avgRating,          // FIXED: was user.rating, now user.avgRating
        totalRatings: user.totalReviews, // FIXED: was user.totalRatings, now user.totalReviews
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
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 })
  }
}