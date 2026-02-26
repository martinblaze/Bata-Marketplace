// lib/auth/auth.ts
// Replace ONLY the getUserFromRequest function at the bottom of your existing file.
// Everything above it (generateToken, verifyToken, hashPassword, etc.) stays the same.

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set.')
}

export function generateToken(userId: string, phone: string | null): string {
  return jwt.sign({ userId, phone }, JWT_SECRET!, { expiresIn: '30d' })
}

export function verifyToken(token: string): { userId: string; phone: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as { userId: string; phone: string }
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return `+${digits}`
  if (digits.startsWith('0')) return `+234${digits.slice(1)}`
  return `+234${digits}`
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function createOTP(email: string): Promise<string> {
  const code = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.oTP.deleteMany({
    where: { email, isUsed: false },
  })

  await prisma.oTP.create({
    data: { email, code, expiresAt },
  })

  return code
}

export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const otp = await prisma.oTP.findFirst({
    where: {
      email,
      code,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
  })

  if (!otp) return false

  await prisma.oTP.update({
    where: { id: otp.id },
    data: { isUsed: true },
  })

  return true
}

export async function sendEmailOTP(email: string, code: string): Promise<boolean> {
  try {
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== '') {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'BATA <onboarding@resend.dev>',
          to: [email],
          subject: 'Your BATA Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #6366F1, #8B5CF6); border-radius: 12px; padding: 12px 20px;">
                  <span style="font-size: 24px; font-weight: 800; color: white; letter-spacing: 2px;">BATA</span>
                </div>
              </div>
              <div style="background: white; border-radius: 12px; padding: 32px; text-align: center;">
                <h2 style="color: #111827; font-size: 20px; margin-bottom: 8px;">Verification Code</h2>
                <p style="color: #6B7280; margin-bottom: 24px;">Enter this code to continue. It expires in 10 minutes.</p>
                <div style="background: #F3F4F6; border-radius: 8px; padding: 16px 24px; display: inline-block; margin-bottom: 24px;">
                  <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #6366F1;">${code}</span>
                </div>
                <p style="color: #9CA3AF; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
              </div>
            </div>
          `,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        console.error('Resend API error:', err)
        return false
      }

      return true
    } else {
      console.log('=====================================')
      console.log('📧 EMAIL OTP (dev mode - no RESEND_API_KEY set)')
      console.log(`To: ${email}`)
      console.log(`Code: ${code}`)
      console.log('=====================================')
      return true
    }
  } catch (error) {
    console.error('Failed to send email OTP:', error)
    return false
  }
}

// ─── Suspension check helper ──────────────────────────────────────────────────
// Returns null if suspended (caller should return 403), or the user if clear.
// Also auto-lifts expired suspensions.
export async function checkSuspension(userId: string): Promise<{
  suspended: boolean
  reason?: string
  until?: Date | null
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuspended: true, suspendedUntil: true, suspensionReason: true },
  })

  if (!user) return { suspended: false }

  // Auto-lift expired suspension
  if (user.isSuspended && user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
    await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: false, suspendedUntil: null, suspensionReason: null },
    })
    return { suspended: false }
  }

  if (user.isSuspended) {
    return {
      suspended: true,
      reason: user.suspensionReason ?? 'Violation of platform terms',
      until: user.suspendedUntil,
    }
  }

  return { suspended: false }
}

// ─── getUserFromRequest ───────────────────────────────────────────────────────
// Returns null if: no token, bad token, user not found, or user is suspended.
// Suspended users get { suspended: true } instead of null so callers can
// return a 403 with context rather than a generic 401.
export async function getUserFromRequest(request: Request): Promise<
  | ({
      id: string
      name: string | null
      phone: string | null
      email: string | null
      matricNumber: string | null
      profilePhoto: string | null
      role: string
      hostelName: string | null
      roomNumber: string | null
      landmark: string | null
      trustLevel: string
      avgRating: number
      totalReviews: number
      completedOrders: number
      pendingBalance: number
      availableBalance: number
      penaltyPoints: number
      isSuspended: boolean
      suspendedUntil: Date | null
      suspensionReason: string | null
      isRiderVerified: boolean
      isAvailable: boolean
      faceDescriptor: import('@prisma/client').Prisma.JsonValue | null
      createdAt: Date
      updatedAt: Date
    })
  | null
> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const decoded = verifyToken(token)
  if (!decoded) return null

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      matricNumber: true,
      profilePhoto: true,
      role: true,
      hostelName: true,
      roomNumber: true,
      landmark: true,
      trustLevel: true,
      avgRating: true,
      totalReviews: true,
      completedOrders: true,
      pendingBalance: true,
      availableBalance: true,
      penaltyPoints: true,
      isSuspended: true,
      suspendedUntil: true,
      suspensionReason: true,
      isRiderVerified: true,
      isAvailable: true,
      faceDescriptor: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) return null

  // ── Auto-lift expired suspension ──
  if (user.isSuspended && user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isSuspended: false, suspendedUntil: null, suspensionReason: null },
    })
    user.isSuspended = false
    user.suspendedUntil = null
    user.suspensionReason = null
  }

  // ── Block suspended users from all API routes ──
  if (user.isSuspended) return null

  return user
}