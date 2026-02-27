// app/api/auth/update-profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/auth'

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, hostelName, roomNumber, landmark } = body

    // Validate phone number
    let formattedPhone = phone
    if (phone) {
      const digits = phone.replace(/\D/g, '')
      if (digits.length < 10 || digits.length > 11) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
      }
      formattedPhone = digits
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        ...(name && { name }),
        ...(formattedPhone && { phone: formattedPhone }),
        ...(hostelName !== undefined && { hostelName }),
        ...(roomNumber !== undefined && { roomNumber }),
        ...(landmark !== undefined && { landmark }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        hostelName: true,
        roomNumber: true,
        landmark: true,
        role: true,
        isSellerMode: true,
      }
    })

    return NextResponse.json({ user: updatedUser })

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}