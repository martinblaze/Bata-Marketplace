// app/api/auth/save-face/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/auth'

// Validate that a value is a 128-element array of finite numbers
function isValidDescriptor(val: unknown): val is number[] {
  return (
    Array.isArray(val) &&
    val.length === 128 &&
    val.every((v) => typeof v === 'number' && isFinite(v))
  )
}

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

    const body = await req.json()

    // ✅ Accept the averaged descriptor sent as a plain Float32Array-converted array.
    // The FaceVerification component averages up to 10 descriptors collected during
    // the liveness session and sends the result as a single 128-number array.
    const { descriptor } = body

    if (!isValidDescriptor(descriptor)) {
      return NextResponse.json(
        { error: 'Invalid face descriptor. Expected 128 finite numbers.' },
        { status: 400 }
      )
    }

    // Confirm user exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ✅ Store as { version: 2, descriptor: number[] }
    // version field lets verify-face handle both old (plain array) and new format gracefully.
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        faceDescriptor: {
          version: 2,
          descriptor, // averaged 128-float array
        },
      },
    })

    return NextResponse.json({ success: true, message: 'Face registered successfully' })
  } catch (error) {
    console.error('[save-face]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}