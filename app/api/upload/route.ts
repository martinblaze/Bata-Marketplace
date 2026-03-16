// app/api/upload/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'

// Allowed image types and max size (5MB)
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Auth check — only logged in users can upload
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // ── File type validation ───────────────────────────────────────────────
    // image is a base64 string like: "data:image/jpeg;base64,/9j/4AAQ..."
    const mimeMatch = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/)

    if (!mimeMatch) {
      return NextResponse.json(
        { error: 'Invalid image format. Must be a base64 encoded image.' },
        { status: 400 }
      )
    }

    const mimeType = mimeMatch[1].toLowerCase()

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: `Invalid file type: ${mimeType}. Only JPEG, PNG, and WebP images are allowed.` },
        { status: 400 }
      )
    }

    // ── File size validation ───────────────────────────────────────────────
    // base64 string length * 0.75 = approximate byte size
    const base64Data = image.split(',')[1] || ''
    const approximateSizeBytes = Math.ceil(base64Data.length * 0.75)

    if (approximateSizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE_MB}MB.` },
        { status: 400 }
      )
    }

    // ── Cloudinary upload ──────────────────────────────────────────────────
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary env vars not set')
      return NextResponse.json({ error: 'Image upload not configured' }, { status: 500 })
    }

    // Build the signed upload request
    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'BATAMART-products'

    const crypto = require('crypto')
    const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex')

    const formData = new FormData()
    formData.append('file', image)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)
    formData.append('folder', folder)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Cloudinary error:', data)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}