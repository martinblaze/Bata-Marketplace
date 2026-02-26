export const dynamic = 'force-dynamic'
// app/api/auth/login-with-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, comparePassword } from '@/lib/auth/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    // Auto-lift expired suspension
    if (user.isSuspended && user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isSuspended: false, suspendedUntil: null, suspensionReason: null },
      })
      user.isSuspended = false
    }

    // Block if still suspended
    if (user.isSuspended) {
      const reason = user.suspensionReason || 'Violation of platform terms'

      let message = ''
      if (!user.suspendedUntil) {
        message = `Your account has been permanently suspended.\n\nReason: ${reason}\n\nContact support@bata.ng to appeal.`
      } else {
        const until = new Date(user.suspendedUntil)
        const diffMs = until.getTime() - Date.now()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const timeLeft = diffDays > 0
          ? `${diffDays} day${diffDays !== 1 ? 's' : ''}${diffHours > 0 ? ` and ${diffHours} hour${diffHours !== 1 ? 's' : ''}` : ''}`
          : `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
        const untilFormatted = until.toLocaleDateString('en-NG', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
        message = `Your account is suspended for ${timeLeft}.\n\nReason: ${reason}\n\nSuspension lifts: ${untilFormatted}\n\nContact support@bata.ng to appeal.`
      }

      return NextResponse.json({ error: message, suspended: true }, { status: 403 })
    }

    const token = generateToken(user.id, user.phone)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        hostelName: user.hostelName,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
