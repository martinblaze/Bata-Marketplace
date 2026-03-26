// app/api/payments/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'
import { prisma } from '@/lib/prisma'
import { notifyOrderPlaced } from '@/lib/notification'

export const dynamic = 'force-dynamic'

// ============================================================
// STANDARDIZED FEE STRUCTURE
// Keep in sync with the verify route — both import calculateFees
// from here so fees are always computed identically.
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
    type CartItem = {
      productId: string
      name: string
      price: number
      quantity: number
      category: string
      sellerId: string
      sellerName: string
      orderNote?: string
    }

    let items: CartItem[] = []

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
          orderNote: item.orderNote,
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
        orderNote: body.orderNote,
      }]
    } else {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 })
    }

    // Can't buy own product
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

    // ── PRODUCTION: Initialize Paystack ───────────────────────
    // DEV MODE is intentionally disabled. Even in local development you should
    // test with Paystack test keys so the full verify flow runs correctly.
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL
    if (!APP_URL) {
      console.error('❌ NEXT_PUBLIC_APP_URL is not set!')
      return NextResponse.json(
        { error: 'Server misconfiguration: NEXT_PUBLIC_APP_URL is not set.' },
        { status: 500 }
      )
    }

    const reference = `BATAMART-${Date.now()}-${user.id.substring(0, 8)}`
    // Strip trailing slash from APP_URL just in case
    const callbackUrl = `${APP_URL.replace(/\/$/, '')}/api/payments/verify`
    console.log('💳 Initializing Paystack — callback:', callbackUrl)

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email || `${user.id}@batamart.app`,
        amount: fees.totalAmount * 100, // kobo
        reference,
        callback_url: callbackUrl,
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

    console.log('✅ Paystack initialized — reference:', reference)

    // ⚠️  IMPORTANT: We return the authorization_url to the frontend here and
    // do NOT create the order yet. The order is only created in /verify after
    // Paystack confirms the payment. The frontend is responsible for keeping
    // the cart/session alive until the user is redirected to Paystack.
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
// createOrders — called ONLY from the verify route after
// Paystack has confirmed the payment is successful.
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
    orderNote?: string
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
  console.log('📝 createOrders called — reference:', paymentReference)

  // Group items by seller so each seller gets their own Order record
  const sellerGroups = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.sellerId]) acc[item.sellerId] = []
    acc[item.sellerId].push(item)
    return acc
  }, {})

  const createdOrders: Awaited<ReturnType<typeof prisma.order.create>>[] = []

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

    // Ensure order numbers are unique even when multiple orders are created
    // in rapid succession (timestamp alone can collide)
    const orderNumber = `BATAMART-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    const itemsList = sellerItems.map(i => `${i.name} (x${i.quantity})`).join(', ')

    console.log('🔨 Creating order:', orderNumber, 'for seller:', sellerId)

    try {
      const order = await prisma.$transaction(async (tx) => {
        const seller = await tx.user.findUnique({
          where: { id: sellerId },
          select: { pendingBalance: true, availableBalance: true },
        })

        if (!seller) throw new Error(`Seller not found: ${sellerId}`)

        // Merge all notes from items in this order into one field
        const orderNote = sellerItems
          .map(item => item.orderNote?.trim())
          .filter((note): note is string => Boolean(note && note.length > 0))
          .join(' | ') || null

        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            buyerId: user.id,
            sellerId,
            productId: sellerItems[0].productId,
            productPrice: Number(orderSubtotal),
            deliveryFee: Number(orderFees.deliveryFee),
            totalAmount: Number(orderFees.totalAmount),
            platformCommission: Number(orderFees.platformTotal),
            quantity: Number(sellerItems.reduce((sum, i) => sum + i.quantity, 0)),
            deliveryHostel: String(user.hostelName ?? ''),
            deliveryRoom: String(user.roomNumber ?? ''),
            deliveryPhone: String(user.phone ?? ''),
            deliveryLandmark: String(user.landmark ?? ''),
            isPaid: true,
            status: 'PENDING' as const,
            orderNote,
            // Create the Payment record (one-to-one relation) at the same time.
            // This is how we track the Paystack reference for duplicate-payment
            // detection in the verify route — Payment.transactionId = reference.
            payment: paymentReference ? {
              create: {
                amount: Number(orderFees.totalAmount),
                method: 'CARD' as const,
                status: 'COMPLETED' as const,
                transactionId: paymentReference,
                paidAt: new Date(),
              },
            } : undefined,
          },
        })

        // Decrement stock for each product in this order
        for (const item of sellerItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: Number(item.quantity) } },
          })
        }

        // Credit seller's pending (escrow) balance
        const sellerShare = Number(orderFees.sellerShare)
        const sellerPendingBalance = Number(seller.pendingBalance ?? 0)

        await tx.user.update({
          where: { id: sellerId },
          data: { pendingBalance: { increment: sellerShare } },
        })

        // Create transaction ledger entries
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
          ],
        })

        return newOrder
      }, {
        timeout: 15000,
        maxWait: 20000,
      })

      createdOrders.push(order)
      notificationQueue.push({
        orderId: order.id,
        buyerId: user.id,
        sellerId,
        orderNumber,
        itemsList,
      })

      console.log('✅ Order created:', orderNumber)

    } catch (orderError) {
      console.error('❌ Failed to create order for seller', sellerId, orderError)
      throw orderError
    }
  }

  // Fire in-app notifications for each order — non-blocking
  for (const n of notificationQueue) {
    notifyOrderPlaced(n.orderId, n.buyerId, n.sellerId, n.orderNumber, n.itemsList)
      .then(() => console.log(`✅ Notification sent for ${n.orderNumber}`))
      .catch(err => console.error(`⚠️  Notification failed for ${n.orderNumber}:`, err))
  }

  console.log('🎉 All orders created:', createdOrders.length)
  return createdOrders
}