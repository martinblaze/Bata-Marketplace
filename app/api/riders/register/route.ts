export const dynamic = 'force-dynamic'
// app/api/riders/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/auth'
import crypto from 'crypto'

// Upload ID document to Cloudinary
async function uploadIdToCloudinary(base64: string): Promise<string | null> {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) return null

    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'bata-rider-ids'
    const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex')

    const formData = new FormData()
    formData.append('file', base64)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)
    formData.append('folder', folder)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    )

    const data = await response.json()
    return data.secure_url || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, password, idDocument } = body

    // Validation
    if (!name || !phone || !email || !password) {
      return NextResponse.json({ error: 'Name, phone, email and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (!/\d/.test(password)) {
      return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 })
    }

    if (!idDocument) {
      return NextResponse.json({ error: 'ID document is required' }, { status: 400 })
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    // Check if phone already exists
    const existingPhone = await prisma.user.findFirst({ where: { phone } })
    if (existingPhone) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 400 })
    }

    // Upload ID to Cloudinary
    const idDocumentUrl = await uploadIdToCloudinary(idDocument)

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create rider — auto-verified for now
    const rider = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        password: hashedPassword,
        role: 'RIDER',
        riderIdDocument: idDocumentUrl || idDocument,
        isRiderVerified: true, // Auto-verified
        isAvailable: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Rider registration successful! You can now log in.',
      rider: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
      },
    })
  } catch (error) {
    console.error('Rider registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
