// app/api/payments/initialize/route.ts - FULLY CORRECTED WITH ORDER NOTES
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'
import { prisma } from '@/lib/prisma'
import { notifyOrderPlaced } from '@/lib/notification'

export const dynamic = 'force-dynamic'

// ============================================================
// STANDARDIZED FEE STRUCTURE (used everywhere consistently)
// ============================================================
export function calculateFees(subtotal: number, deliveryFee: number = 800) {
  const PLATFORM_RATE = 0.05
  const RIDER_SHARE = 560
  const PLATFORM_DELIVERY_CUT = 240

  const platformFeeFromProducts = subtotal * PLATFORM_RATE
  const sellerShare = subtotal - platformFeeFromProducts
  const riderShare = RIDER_SHARE
  const platformTotal = platformFeeFromProducts + PLATFORM_DELIVERY_CUT
  const totalAmount = subtotal + deliveryFee

  return {
    subtotal,
    deliveryFee,
    totalAmount,
    sellerShare,
    riderShare,
    platformTotal,
    platformFeeFromProducts,
    PLATFORM_DELIVERY_CUT,
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, cartItems, deliveryFee = 800 } = body

    // ── Build items list ──────────────────────────────────────
    let items: {
      productId: string
      name: string
      price: number
      quantity: number
      category: string
      sellerId: string
      sellerName: string
      orderNote?: string  // ← ADDED orderNote field
    }[] = []

    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      for (const item of cartItems) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: { seller: true },
        })
        if (!product) {
          return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 404 })
        }
        if (!product.isActive || product.quantity < item.quantity) {
          return NextResponse.json({ error: `Product unavailable: ${product.name}` }, { status: 400 })
        }
        items.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          category: product.category,
          sellerId: product.sellerId,
          sellerName: product.seller.name,
          orderNote: item.orderNote,  // ← ADDED: preserve orderNote from cart item
        })
      }
    } else if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { seller: true },
      })
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      if (!product.isActive || product.quantity < 1) {
        return NextResponse.json({ error: 'Product unavailable' }, { status: 400 })
      }
      items = [{
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        category: product.category,
        sellerId: product.sellerId,
        sellerName: product.seller.name,
        orderNote: body.orderNote,  // ← ADDED: for single product purchase
      }]
    } else {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 })
    }

    // Can't buy your own product
    const ownProduct = items.find(i => i.sellerId === user.id)
    if (ownProduct) {
      return NextResponse.json({ error: 'You cannot buy your own product' }, { status: 400 })
    }

    // ── Calculate totals ──────────────────────────────────────
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const fees = calculateFees(subtotal, deliveryFee)

    console.log('=== PAYMENT INIT ===', {
      items: items.map(i => `${i.name} x${i.quantity} = ₦${i.price * i.quantity}${i.orderNote ? ` (Note: ${i.orderNote})` : ''}`),
      ...fees,
    })

    // ── DEV MODE: skip Paystack, create orders directly ───────
    const useDevMode = false // ← Set to false for production
    
    if (useDevMode && process.env.NODE_ENV === 'development') {
      console.log('🔧 DEV MODE: Creating orders without Paystack')
      const createdOrders = await createOrders(items, user, fees)
      
      return NextResponse.json({
        success: true,
        devMode: true,
        message: 'Orders placed (Dev Mode)',
        orders: createdOrders.map(o => ({ 
          orderNumber: o.orderNumber, 
          orderId: o.id 
        })),
        orderId: createdOrders[0].id,
        orderNumber: createdOrders[0].orderNumber,
        breakdown: fees,
      })
    }

    // ── PRODUCTION: Initialize Paystack ───────────────────────
    console.log('💳 PROD MODE: Initializing Paystack payment')
    const reference = `BATA-${Date.now()}-${user.id.substring(0, 8)}`

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email || `${user.id}@bata.app`,
        amount: fees.totalAmount * 100, // kobo
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/verify`,
        metadata: {
          userId: user.id,
          cartItems: items,
          deliveryFee,
          fees,
        },
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackData.status) {
      console.error('Paystack initialization failed:', paystackData)
      return NextResponse.json(
        { error: paystackData.message || 'Payment initialization failed' },
        { status: 400 }
      )
    }

    console.log('✅ Paystack initialized:', reference)

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    })
  } catch (error) {
    console.error('Payment init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

// ══════════════════════════════════════════════════════════════
// ✅ FIXED createOrders - WITH ORDER NOTES ADDED
// ══════════════════════════════════════════════════════════════
export async function createOrders(
  items: {
    productId: string
    name: string
    price: number
    quantity: number
    category: string
    sellerId: string
    sellerName: string
    orderNote?: string  // ← ADDED orderNote field to type
  }[],
  user: { 
    id: string
    hostelName?: string | null
    roomNumber?: string | null
    phone?: string | null
    landmark?: string | null 
  },
  fees: ReturnType<typeof calculateFees>,
  paymentReference?: string
) {
  console.log('📝 createOrders called')

  // Group items by seller
  const sellerGroups = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.sellerId]) acc[item.sellerId] = []
    acc[item.sellerId].push(item)
    return acc
  }, {})

  const createdOrders = []
  const notificationQueue: Array<{
    orderId: string
    buyerId: string
    sellerId: string
    orderNumber: string
    itemsList: string
  }> = []

  for (const [sellerId, sellerItems] of Object.entries(sellerGroups)) {
    const orderSubtotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const proportion = fees.subtotal > 0 ? orderSubtotal / fees.subtotal : 1
    const orderFees = calculateFees(orderSubtotal, Math.round(fees.deliveryFee * proportion))

    const orderNumber = `BATA-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    const itemsList = sellerItems.map(i => `${i.name} (x${i.quantity})`).join(', ')

    console.log('🔨 Creating order:', orderNumber)

    try {
      // ═══════════════════════════════════════════════════════
      // CRITICAL FIX: Transaction ONLY for database operations
      // ═══════════════════════════════════════════════════════
      const order = await prisma.$transaction(async (tx) => {
        const seller = await tx.user.findUnique({
          where: { id: sellerId },
          select: { pendingBalance: true, availableBalance: true },
        })

        if (!seller) {
          throw new Error(`Seller not found: ${sellerId}`)
        }

        // Combine order notes from all items in this order
        const orderNotes = sellerItems
          .map(item => item.orderNote?.trim())
          .filter(note => note && note.length > 0)
          .join(' | ')

        const orderData = {
          orderNumber,
          buyerId: user.id,
          sellerId,
          productId: sellerItems[0].productId,
          productPrice: Number(orderSubtotal),
          deliveryFee: Number(orderFees.deliveryFee),
          totalAmount: Number(orderFees.totalAmount),
          platformCommission: Number(orderFees.platformTotal),
          quantity: Number(sellerItems.reduce((sum, i) => sum + i.quantity, 0)),
          deliveryHostel: String(user.hostelName || ''),
          deliveryRoom: String(user.roomNumber || ''),
          deliveryPhone: String(user.phone || ''),
          deliveryLandmark: String(user.landmark || ''),
          isPaid: true,
          paymentId: paymentReference || `dev_${Date.now()}`,
          status: 'PENDING' as const,
          orderNote: orderNotes || null,  // ← ADDED: store combined order notes
        }

        const newOrder = await tx.order.create({ data: orderData })

        // Reduce stock
        for (const item of sellerItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: Number(item.quantity) } },
          })
        }

        // Update balances
        const sellerShare = Number(orderFees.sellerShare)
        const sellerPendingBalance = Number(seller.pendingBalance || 0)

        await tx.user.update({
          where: { id: sellerId },
          data: { pendingBalance: { increment: sellerShare } },
        })

        // Create transaction records
        await tx.transaction.createMany({
          data: [
            {
              userId: sellerId,
              type: 'ESCROW',
              amount: sellerShare,
              description: `Escrow held for: ${itemsList} (Order: ${orderNumber})`,
              reference: `${orderNumber}-SELLER-ESCROW`,
              balanceBefore: sellerPendingBalance,
              balanceAfter: sellerPendingBalance + sellerShare,
            },
            {
              userId: user.id,
              type: 'ESCROW',
              amount: Number(orderFees.riderShare),
              description: `Rider fee held for delivery (Order: ${orderNumber})`,
              reference: `${orderNumber}-RIDER-ESCROW`,
              balanceBefore: 0,
              balanceAfter: 0,
            },
            {
              userId: user.id,
              type: 'DEBIT',
              amount: Number(orderFees.totalAmount),
              description: `Payment for ${itemsList} (Order: ${orderNumber})`,
              reference: `${orderNumber}-BUYER-PAYMENT`,
              balanceBefore: 0,
              balanceAfter: 0,
            },
          ]
        })

        return newOrder
      }, {
        timeout: 15000,
        maxWait: 20000,
      })

      createdOrders.push(order)
      
      // Queue notification for later
      notificationQueue.push({
        orderId: order.id,
        buyerId: user.id,
        sellerId,
        orderNumber,
        itemsList,
      })

      console.log('✅ Order created:', orderNumber)
      
    } catch (orderError) {
      console.error('❌ Failed to create order:', orderNumber, orderError)
      throw orderError
    }
  }

  // ═══════════════════════════════════════════════════════
  // ✅ SEND NOTIFICATIONS AFTER ALL ORDERS CREATED
  // ═══════════════════════════════════════════════════════
  console.log(`📧 Sending ${notificationQueue.length} notifications...`)
  
  for (const notification of notificationQueue) {
    notifyOrderPlaced(
      notification.orderId,
      notification.buyerId,
      notification.sellerId,
      notification.orderNumber,
      notification.itemsList
    )
    .then(() => console.log(`✅ Notification sent for ${notification.orderNumber}`))
    .catch(err => console.error(`⚠️ Notification failed:`, err))
  }

  console.log('🎉 All orders created successfully:', createdOrders.length)
  return createdOrders
}