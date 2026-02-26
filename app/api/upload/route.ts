export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'

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

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary env vars not set')
      return NextResponse.json({ error: 'Image upload not configured' }, { status: 500 })
    }

    // Build the signed upload request
    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'bata-products'

    // Generate signature using crypto
    const crypto = require('crypto')
    const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex')

    // Upload to Cloudinary
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

    // Return the secure URL
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
