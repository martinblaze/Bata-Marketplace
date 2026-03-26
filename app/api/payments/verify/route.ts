// app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOrders, calculateFees } from '../initialize/route'

// ⚠️  REMOVED the top-level import of @/lib/push/sendPushNotification.
//     That import was causing the ENTIRE module to fail to load whenever
//     the push notification env vars (VAPID keys etc.) were missing or
//     the module had any runtime error — which crashes the verify route
//     before a single line of code runs, sending every user to the
//     catch block → /checkout?error=verification_failed → /marketplace.
//     All push/notification calls are now done with dynamic imports inside
//     a fire-and-forget Promise.allSettled so they NEVER block the redirect.

export const dynamic = 'force-dynamic'

// ── Helper: redirect to the correct app domain ──────────────────────────────
function appRedirect(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL
  if (!base) {
    // Hard-fail loudly rather than silently redirecting to the wrong place
    console.error('❌ CRITICAL: NEXT_PUBLIC_APP_URL is not set in environment variables!')
    // Still fall back so the user is not left on a blank Paystack page
    return NextResponse.redirect(`https://bata-mart.vercel.app${path}`)
  }
  // Strip any accidental trailing slash from the env var before building URL
  return NextResponse.redirect(`${base.replace(/\/$/, '')}${path}`)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  console.log('═'.repeat(70))
  console.log('🔥 PAYMENT VERIFICATION STARTED')
  console.log('═'.repeat(70))
  console.log('📍 Reference:', reference)
  console.log('📍 Timestamp:', new Date().toISOString())
  console.log('📍 APP_URL:', process.env.NEXT_PUBLIC_APP_URL ?? '⚠️  NOT SET')

  if (!reference) {
    console.error('❌ ERROR: No reference in URL')
    return appRedirect('/checkout?error=no_reference')
  }

  try {
    // ── STEP 1: Verify with Paystack ───────────────────────────────────────
    console.log('\n📞 STEP 1: Verifying with Paystack')

    let verifyData: any
    try {
      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      )
      console.log('HTTP Status:', verifyRes.status)
      verifyData = await verifyRes.json()
    } catch (fetchErr) {
      console.error('❌ Network error calling Paystack:', fetchErr)
      return appRedirect('/checkout?error=payment_failed')
    }

    console.log('📦 Paystack Response status:', verifyData?.status, '| tx status:', verifyData?.data?.status)

    if (!verifyData?.status) {
      console.error('❌ Paystack returned status=false:', verifyData?.message)
      return appRedirect('/checkout?error=payment_failed')
    }

    if (verifyData.data?.status !== 'success') {
      console.error('❌ Payment not successful. Status:', verifyData.data?.status)
      return appRedirect('/checkout?error=payment_failed')
    }

    console.log('✅ Payment verified with Paystack')

    // ── STEP 2: Duplicate-payment guard ───────────────────────────────────
    // The Payment model stores the Paystack reference in transactionId.
    // The Order model has NO paymentId field — it has a `payment` relation.
    // So we query Payment by transactionId and navigate to the order through
    // the relation. This correctly prevents double-processing the same webhook.
    console.log('\n🔄 STEP 2: Duplicate-payment guard')

    const existingPayment = await prisma.payment.findFirst({
      where: { transactionId: reference },
      include: {
        order: { select: { id: true, orderNumber: true } },
      },
    })

    if (existingPayment?.order) {
      console.log('⚠️  Payment already processed — idempotent redirect')
      console.log('   Order:', existingPayment.order.orderNumber)
      return appRedirect(`/orders?payment=success&order=${existingPayment.order.orderNumber}`)
    }

    console.log('✅ No duplicate found — safe to create order')

    // ── STEP 3: Extract metadata ───────────────────────────────────────────
    console.log('\n📋 STEP 3: Extracting Metadata')

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

    const meta = verifyData.data.metadata as {
      userId: string
      cartItems: CartItem[]
      deliveryFee: number
      fees: ReturnType<typeof calculateFees>
    }

    console.log('📋 Metadata snapshot:', JSON.stringify({
      userId: meta?.userId,
      itemCount: meta?.cartItems?.length,
      deliveryFee: meta?.deliveryFee,
    }))

    if (!meta?.userId || !Array.isArray(meta?.cartItems) || meta.cartItems.length === 0) {
      console.error('❌ Invalid/missing metadata:', JSON.stringify(meta))
      return appRedirect('/checkout?error=invalid_metadata')
    }

    console.log('✅ Metadata OK — User:', meta.userId, '| Items:', meta.cartItems.length)

    // ── STEP 4: Fetch buyer ────────────────────────────────────────────────
    console.log('\n👤 STEP 4: Fetching Buyer')

    const buyer = await prisma.user.findUnique({
      where: { id: meta.userId },
      select: {
        id: true, name: true, email: true,
        hostelName: true, roomNumber: true,
        phone: true, landmark: true,
      },
    })

    if (!buyer) {
      console.error('❌ Buyer not found for userId:', meta.userId)
      return appRedirect('/checkout?error=user_not_found')
    }

    console.log('✅ Buyer found:', buyer.name)

    // ── STEP 5: Validate products are still in stock ───────────────────────
    console.log('\n📦 STEP 5: Validating Products')

    for (const item of meta.cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, quantity: true, isActive: true },
      })

      if (!product) {
        console.error('❌ Product not found:', item.productId)
        return appRedirect(`/checkout?error=product_not_found&product=${encodeURIComponent(item.name)}`)
      }
      if (!product.isActive) {
        console.error('❌ Product inactive:', item.name)
        return appRedirect(`/checkout?error=product_inactive&product=${encodeURIComponent(item.name)}`)
      }
      if (product.quantity < item.quantity) {
        console.error('❌ Insufficient stock:', item.name, '| has:', product.quantity, '| needs:', item.quantity)
        return appRedirect(`/checkout?error=out_of_stock&product=${encodeURIComponent(item.name)}`)
      }
      console.log(`✅ ${item.name}: OK (stock: ${product.quantity})`)
    }

    // ── STEP 6: Create orders ──────────────────────────────────────────────
    console.log('\n💰 STEP 6: Creating Orders')

    const subtotal = meta.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const fees = meta.fees ?? calculateFees(subtotal, meta.deliveryFee ?? 800)

    console.log('💰 Fees:', JSON.stringify(fees))

    const orders = await createOrders(meta.cartItems, buyer, fees, reference)

    if (!orders || orders.length === 0) {
      console.error('❌ createOrders returned empty result')
      return appRedirect('/checkout?error=order_creation_failed')
    }

    console.log('✅ Orders created:', orders.map(o => o.orderNumber).join(', '))

    // ── STEP 7: Fire notifications (non-blocking — NEVER delay the redirect) ─
    console.log('\n🔔 STEP 7: Queueing Notifications (fire-and-forget)')

    // Build a map of sellerId → order info for per-seller notifications
    const sellerMap = new Map<string, {
      orderId: string
      orderNumber: string
      orderNote?: string
      itemsList: string
    }>()

    for (const order of orders) {
      if (order.sellerId && !sellerMap.has(order.sellerId)) {
        const sellerItems = meta.cartItems.filter(i => i.sellerId === order.sellerId)
        const matchingItem = sellerItems[0]
        sellerMap.set(order.sellerId, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderNote: matchingItem?.orderNote,
          itemsList: sellerItems.map(i => `${i.name} (x${i.quantity})`).join(', '),
        })
      }
    }

    // All notification work happens inside a fire-and-forget block.
    // If ANY of these fail they log an error but DO NOT affect the redirect.
    Promise.allSettled([
      // 1. In-app bell for buyer
      import('@/lib/notification')
        .then(({ notifyOrderPlaced: createBuyerNotif }) =>
          createBuyerNotif(
            orders[0].id,
            buyer.id,
            orders[0].sellerId,
            orders[0].orderNumber,
            meta.cartItems.map(i => i.name).join(', ')
          )
        )
        .catch(err => console.error('⚠️  Buyer bell notification failed:', err)),

      // 2. Push notification for buyer
      import('@/lib/push/sendPushNotification')
        .then(({ notifyOrderPlaced: pushBuyer }) => pushBuyer(buyer.id, orders[0].orderNumber))
        .catch(err => console.error('⚠️  Buyer push notification failed:', err)),

      // 3. Per-seller notifications
      ...Array.from(sellerMap.entries()).map(([sellerId, info]) =>
        notifySellerOfNewOrder(
          sellerId,
          info.orderId,
          info.orderNumber,
          info.orderNote,
          buyer.name ?? 'A buyer',
          info.itemsList,
        ).catch(err => console.error(`⚠️  Seller notification failed for ${sellerId}:`, err))
      ),
    ]).then(results => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Notification slot ${i} rejected:`, r.reason)
        }
      })
    })

    // ── SUCCESS ────────────────────────────────────────────────────────────
    const firstOrderNumber = orders[0]?.orderNumber ?? orders[0]?.id
    const redirectUrl = `/orders?payment=success&order=${firstOrderNumber}&count=${orders.length}`

    console.log('\n🎉 SUCCESS — Redirecting to:', redirectUrl)
    console.log('═'.repeat(70))

    return appRedirect(redirectUrl)

  } catch (error) {
    console.error('\n💥 FATAL ERROR in payment verification:')
    console.error(error instanceof Error ? error.message : error)
    if (error instanceof Error) console.error(error.stack)
    // Redirect to checkout with error flag — checkout page will display the
    // "verification failed, contact support" message.
    return appRedirect('/checkout?error=verification_failed&reason=exception')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seller notification helper (all imports are dynamic so a missing module
// never crashes the verify route)
// ─────────────────────────────────────────────────────────────────────────────
async function notifySellerOfNewOrder(
  sellerId: string,
  orderId: string,
  orderNumber: string,
  orderNote: string | undefined,
  buyerName: string,
  itemsList: string,
) {
  const hasNote = Boolean(orderNote?.trim())

  const [notifMod, pushMod, emailMod, prismaMod] = await Promise.all([
    import('@/lib/notification').catch(() => null),
    import('@/lib/push/sendPushNotification').catch(() => null),
    import('@/lib/email/sendEmail').catch(() => null),
    import('@/lib/prisma').catch(() => null),
  ])

  const seller = prismaMod
    ? await prismaMod.prisma.user.findUnique({
        where: { id: sellerId },
        select: { email: true },
      }).catch(() => null)
    : null

  const tasks: Promise<any>[] = []

  // In-app bell: new order
  if (notifMod?.createNotification) {
    tasks.push(
      notifMod.createNotification({
        userId: sellerId,
        type: 'ORDER_PLACED',
        title: '🛒 New Order Received!',
        message: `You have a new order (#${orderNumber}) for ${itemsList}`,
        orderId,
        metadata: { orderNumber, buyerName, itemsList },
      })
    )

    // In-app bell: buyer note (separate notification so it stands out)
    if (hasNote) {
      tasks.push(
        notifMod.createNotification({
          userId: sellerId,
          type: 'ORDER_PLACED',
          title: '📝 Note from Buyer',
          message: `For order #${orderNumber}: "${orderNote}"`,
          orderId,
          metadata: { orderNumber, orderNote },
        })
      )
    }
  }

  // Push notification
  if (pushMod?.notifyNewOrder) {
    tasks.push(pushMod.notifyNewOrder(sellerId, orderNumber))
  }

  // Email to seller (only when there is a buyer note — keeps inbox clean)
  if (hasNote && seller?.email && emailMod?.sendEmail) {
    const { subject, html } = buildSellerOrderEmail(orderNumber, buyerName, orderNote)
    tasks.push(emailMod.sendEmail({ to: seller.email, subject, html }))
  }

  await Promise.allSettled(tasks)
}

// ─────────────────────────────────────────────────────────────────────────────
// Seller email template
// ─────────────────────────────────────────────────────────────────────────────
function buildSellerOrderEmail(orderNumber: string, buyerName: string, orderNote?: string) {
  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://bata-mart.vercel.app').replace(/\/$/, '')
  const hasNote = Boolean(orderNote?.trim())

  const noteBlock = hasNote
    ? `
      <div style="margin:20px 0;padding:16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">
          📝 Customer's Note to You
        </p>
        <p style="margin:0;font-size:15px;color:#78350f;line-height:1.6;font-style:italic;">
          "${orderNote}"
        </p>
      </div>
    `
    : ''

  return {
    subject: `🎉 New Order #${orderNumber} — BATAMART`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:28px;font-weight:800;color:#111827;letter-spacing:-1px;">BATAMART</span>
              <span style="font-size:12px;color:#6b7280;display:block;margin-top:2px;">UNIZIK Campus Marketplace</span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <p style="font-size:32px;margin:0 0 8px;">🎉</p>
              <h2 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">New Order Received!</h2>
              <p style="font-size:15px;color:#6b7280;margin:0 0 4px;">
                <strong style="color:#111827;">${buyerName}</strong> just placed order
                <strong style="color:#111827;">#${orderNumber}</strong>.
              </p>
              <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">
                Please confirm it as soon as possible so a rider can be assigned.
              </p>
              ${noteBlock}
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;"/>
              <p style="font-size:13px;color:#9ca3af;margin:0 0 20px;">
                ⚠️ Orders not confirmed within 30 minutes may be auto-cancelled.
              </p>
              <a href="${APP_URL}/orders/sales"
                 style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;border-radius:10px;text-decoration:none;">
                Confirm Order Now →
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                BATAMART — UNIZIK Campus Marketplace · Awka, Anambra State
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }
}