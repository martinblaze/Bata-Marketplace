// app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOTP, generateToken, formatPhone } from '@/lib/auth/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, email, code, otpCode, name } = body

    const otpValue = otpCode || code

    if (!otpValue) {
      return NextResponse.json({ error: 'OTP code is required' }, { status: 400 })
    }

    const identifier = phone ? formatPhone(phone) : email

    if (!identifier) {
      return NextResponse.json(
        { error: 'Phone or email is required' },
        { status: 400 }
      )
    }

    const isValid = await verifyOTP(identifier, otpValue)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // ✅ Signup flow (no name) — just confirm OTP is valid, user created later in signup-with-password
    if (!name) {
      return NextResponse.json({ success: true })
    }

    // Login / other flows that pass a name — find or create user
    let user = await prisma.user.findFirst({
      where: phone ? { phone: formatPhone(phone) } : { email },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: phone ? formatPhone(phone) : undefined,
          email: email || undefined,
          name,
          password: '',
        },
      })
    }

    const token = generateToken(user.id, user.phone || user.email || '')

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        hostelName: user.hostelName,
      },
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}