export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { isSellerMode } = await request.json()

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isSellerMode }, // ← FIXED: was { sellerOrders: isSellerMode }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        role: updatedUser.role,
        isSellerMode: updatedUser.isSellerMode,
      },
    })
  } catch (error) {
    console.error('Toggle seller mode error:', error)
    return NextResponse.json(
      { error: 'Failed to update seller mode' },
      { status: 500 }
    )
  }
}
