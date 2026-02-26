// app/api/products/[id]/route.ts - FULLY FIXED VERSION

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

// GET single product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avgRating: true, // Changed from 'rating' to 'avgRating'
            trustLevel: true,
            completedOrders: true,
            profilePhoto: true, // Added for display
            hostelName: true, // Added for display
            roomNumber: true, // Added for display
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Increment view count
    await prisma.product.update({
      where: { id: params.id },
      data: { viewCount: { increment: 1 } },
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Fetch product error:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

// DELETE product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this product' }, { status: 403 })
    }

    await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}

// PUT - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this product' }, { status: 403 })
    }

    const body = await request.json()
    
    // Allow partial updates
    const updateData: any = {}
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.price !== undefined) updateData.price = parseFloat(body.price)
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.images !== undefined) updateData.images = body.images
    if (body.hostelName !== undefined) updateData.hostelName = body.hostelName
    if (body.roomNumber !== undefined) updateData.roomNumber = body.roomNumber
    if (body.landmark !== undefined) updateData.landmark = body.landmark
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.quantity !== undefined) updateData.quantity = parseInt(body.quantity)

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ 
      success: true, 
      product: updatedProduct,
      message: 'Product updated successfully',
    })
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}