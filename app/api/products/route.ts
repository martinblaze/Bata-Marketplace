// app/api/products/route.ts - COMPLETE FIXED VERSION

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

// GET all products (for marketplace - only shows in-stock products)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // ⚠️ CRITICAL: Only show products that are:
    // 1. Active (isActive = true)
    // 2. In stock (quantity > 0)
    const where: any = {
      isActive: true,
      quantity: {
        gt: 0, // Greater than 0 - MUST HAVE STOCK
      },
    }

    // Filter by category if provided
    if (category && category !== 'All') {
      where.category = category
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avgRating: true, // Changed from 'rating' to 'avgRating'
            trustLevel: true,
            completedOrders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ 
      success: true, 
      products,
      count: products.length,
      message: `Found ${products.length} products in stock`,
    })
  } catch (error) {
    console.error('Fetch products error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only sellers can create products
    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Only sellers can list products. Please update your profile to become a seller.' 
      }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      price,
      images,
      category,
      quantity,
      hostelName,
      roomNumber,
      landmark,
    } = body

    // Validation
    if (!name || !description || !price || !images || images.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields (name, description, price, images)' 
      }, { status: 400 })
    }

    if (price <= 0) {
      return NextResponse.json({ 
        error: 'Price must be greater than 0' 
      }, { status: 400 })
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json({ 
        error: 'Quantity must be at least 1' 
      }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ 
        error: 'Please select a category' 
      }, { status: 400 })
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        images,
        category,
        quantity: parseInt(quantity),
        hostelName: hostelName || user.hostelName || '',
        roomNumber: roomNumber || user.roomNumber || '',
        landmark: landmark || user.landmark || '',
        sellerId: user.id,
        isActive: true,
      },
    })

    console.log('✅ Product created:', {
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      price: product.price,
    })

    return NextResponse.json({ 
      success: true, 
      product,
      message: `${product.name} listed successfully with ${product.quantity} items in stock!`,
    })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ 
      error: 'Failed to create product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}