import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quantity } = await request.json()

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== user.id) {
      return NextResponse.json({ error: 'Not your product' }, { status: 403 })
    }

    // Add quantity and reactivate
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        quantity: product.quantity + quantity,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, product: updatedProduct })
  } catch (error) {
    console.error('Restock error:', error)
    return NextResponse.json({ error: 'Failed to restock' }, { status: 500 })
  }
}