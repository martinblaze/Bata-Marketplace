export const dynamic = 'force-dynamic'
// app/api/auth/verify-face/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/auth'

// ── Euclidean distance between two 128-point descriptors ──────────────────────
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
}

// ── Validate a 128-number descriptor ─────────────────────────────────────────
function isValidDescriptor(val: unknown): val is number[] {
  return (
    Array.isArray(val) &&
    val.length === 128 &&
    val.every((v) => typeof v === 'number' && isFinite(v))
  )
}

// ── Parse stored faceDescriptor from Prisma JsonValue ────────────────────────
// Handles two stored formats:
//   Legacy (v1): plain number[] — saved before the multi-descriptor update
//   Current (v2): { version: 2, descriptor: number[] } — averaged descriptor
function parseStoredDescriptor(raw: unknown): number[] | null {
  if (!raw) return null

  // v1: plain array stored directly
  if (Array.isArray(raw)) {
    return isValidDescriptor(raw) ? raw : null
  }

  // v2: { version: 2, descriptor: number[] }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if (isValidDescriptor(obj.descriptor)) {
      return obj.descriptor as number[]
    }
  }

  return null
}

// ── In-memory rate limiter ────────────────────────────────────────────────────
// 5 failed attempts per user per 15-minute window.
// For multi-instance / serverless: swap this map for Upstash Redis.
const failedAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX        = 5
const RATE_LIMIT_WINDOW_MS  = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(userId: string): { allowed: boolean; remainingMs?: number } {
  const now   = Date.now()
  const entry = failedAttempts.get(userId)
  if (!entry || now > entry.resetAt) return { allowed: true }
  if (entry.count >= RATE_LIMIT_MAX) return { allowed: false, remainingMs: entry.resetAt - now }
  return { allowed: true }
}

function recordFailure(userId: string): number {
  const now   = Date.now()
  const entry = failedAttempts.get(userId)
  if (!entry || now > entry.resetAt) {
    failedAttempts.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return 1
  }
  entry.count++
  return entry.count
}

function clearFailures(userId: string): void {
  failedAttempts.delete(userId)
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // ✅ Rate limit check before doing any DB work
    const rateCheck = checkRateLimit(payload.userId)
    if (!rateCheck.allowed) {
      const minutes = Math.ceil((rateCheck.remainingMs ?? 0) / 60000)
      return NextResponse.json(
        {
          error: `Too many failed attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
        },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { descriptor } = body

    // ✅ Validate incoming descriptor
    if (!isValidDescriptor(descriptor)) {
      return NextResponse.json(
        { error: 'Invalid face descriptor. Expected 128 finite numbers.' },
        { status: 400 }
      )
    }

    // Fetch stored descriptor
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { faceDescriptor: true },
    })

    // No face registered at all
    if (!user?.faceDescriptor) {
      return NextResponse.json(
        {
          error: 'FACE_ID_REQUIRED',
          message: 'No face registered for this account. Please register your Face ID first.',
        },
        { status: 400 }
      )
    }

    // ✅ Safely parse stored descriptor — handles v1 (plain array) and v2 ({ version, descriptor })
    const storedDescriptor = parseStoredDescriptor(user.faceDescriptor)

    if (!storedDescriptor) {
      // Stored data is corrupted — clear it so user can re-register cleanly
      await prisma.user.update({
        where: { id: payload.userId },
        data: { faceDescriptor: null },
      })
      return NextResponse.json(
        {
          error: 'Your stored Face ID data was corrupted and has been cleared. Please register your face again.',
        },
        { status: 400 }
      )
    }

    // ✅ Compare descriptors
    const distance = euclideanDistance(storedDescriptor, descriptor)

    // face-api.js standard threshold: 0.6
    // We use 0.55 for tighter withdrawal security.
    // Multi-descriptor averaging during registration keeps false-rejection rate low
    // even at this stricter threshold.
    const MATCH_THRESHOLD = 0.55
    const isMatch = distance < MATCH_THRESHOLD

    if (!isMatch) {
      const failCount    = recordFailure(payload.userId)
      const attemptsLeft = Math.max(0, RATE_LIMIT_MAX - failCount)

      return NextResponse.json(
        {
          error:
            attemptsLeft > 0
              ? `Face does not match. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before temporary lock.`
              : 'Too many failed attempts. Verification locked for 15 minutes.',
        },
        { status: 401 }
      )
    }

    // ✅ Verified — clear any recorded failures
    clearFailures(payload.userId)

    return NextResponse.json({
      success: true,
      message: 'Face verified successfully',
    })
  } catch (error) {
    console.error('[verify-face]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
