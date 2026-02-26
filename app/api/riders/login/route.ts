export const dynamic = 'force-dynamic'
// app/api/riders/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken } from '@/lib/auth/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Find rider by email
    const rider = await prisma.user.findUnique({ where: { email } })

    if (!rider) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Must be a rider
    if (rider.role !== 'RIDER') {
      return NextResponse.json({ error: 'This account is not a rider account' }, { status: 403 })
    }

    // Check if suspended
    if (rider.isSuspended) {
      return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 })
    }

    // Verify password
    const passwordMatch = await comparePassword(password, rider.password)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Generate token
    const token = generateToken(rider.id, rider.role)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        role: rider.role,
        isRiderVerified: rider.isRiderVerified,
        isAvailable: rider.isAvailable,
        availableBalance: rider.availableBalance,
        pendingBalance: rider.pendingBalance,
      },
    })
  } catch (error) {
    console.error('Rider login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
