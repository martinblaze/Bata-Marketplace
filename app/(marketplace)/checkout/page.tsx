// app/(marketplace)/checkout/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/lib/cart-store'
import {
  ChevronLeft, Lock, Shield, Truck, CheckCircle,
  MapPin, Phone, User, Home, Loader2, AlertCircle,
  MessageSquare, Info, ArrowRight, Package,
} from 'lucide-react'

export default function CheckoutPage() {
  const router = useRouter()
  const { clearCart } = useCartStore()
  const [cartItems, setCartItems] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Per-item order notes
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    const searchParams = new URLSearchParams(window.location.search)
    const urlError = searchParams.get('error')
    const productName = searchParams.get('product')

    if (urlError === 'payment_failed') setError('Payment verification failed. Please try again.')
    else if (urlError === 'out_of_stock' && productName) setError(`Sorry, ${decodeURIComponent(productName)} is now out of stock.`)
    else if (urlError === 'verification_failed') setError('Payment verification failed. Please contact support if you were charged.')

    const cartData = sessionStorage.getItem('checkout_cart')
    if (cartData) {
      setCartItems(JSON.parse(cartData))
    } else {
      const productData = sessionStorage.getItem('checkout_product')
      if (productData) {
        const product = JSON.parse(productData)
        setCartItems([{
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.images[0],
          sellerId: product.sellerId,
          sellerName: product.seller.name,
        }])
      } else {
        router.push('/marketplace')
        return
      }
    }

    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await response.json()
      if (response.ok) setUser(data.user)
    } catch (error) { console.error('Error fetching profile:', error) }
  }

  const handlePayment = async () => {
    if (!user?.hostelName) {
      alert('Please complete your profile first!')
      router.push('/profile/setup')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')

      // Attach per-item notes to cart items before sending
      const cartItemsWithNotes = cartItems.map(item => ({
        ...item,
        orderNote: orderNotes[item.productId]?.trim() || '',
      }))

      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cartItems: cartItemsWithNotes, deliveryFee: 800 }),
      })

      const data = await response.json()

      if (response.ok) {
        sessionStorage.removeItem('checkout_product')
        sessionStorage.removeItem('checkout_cart')
        clearCart()

        if (data.devMode || data.orderId) {
          router.push(`/orders?payment=success&order=${data.orderNumber || data.orderId}`)
        } else if (data.authorization_url) {
          window.location.href = data.authorization_url
        }
      } else {
        setError(data.error || 'Payment failed')
      }
    } catch (err) {
      console.error('Payment error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)

  if (cartItems.length === 0 || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-bata-primary border-t-transparent" />
    </div>
  )

  const deliveryFee = 800
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalAmount = subtotal + deliveryFee
  const platformFee = subtotal * 0.05 + 240
  const riderAmount = 560
  const sellerAmount = subtotal * 0.95
  const hasNotes = Object.values(orderNotes).some(n => n.trim().length > 0)

  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-20">

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/cart')}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-bata-primary transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Cart
          </button>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <Lock className="w-4 h-4 text-emerald-500" />
            Secure Checkout
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-7">Checkout</h1>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">

          {/* ── LEFT: Main sections ──────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* ── Delivery address ──────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-bata-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-bata-primary" />
                  </div>
                  <h2 className="font-black text-gray-900">Delivery Address</h2>
                </div>
                <Link href="/profile/setup" className="text-xs font-bold text-bata-primary hover:text-bata-dark transition-colors flex items-center gap-1">
                  Edit <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="p-5 grid sm:grid-cols-2 gap-4">
                {[
                  { icon: <User className="w-4 h-4 text-gray-400" />, label: 'Name', value: user.name },
                  { icon: <Phone className="w-4 h-4 text-gray-400" />, label: 'Phone', value: user.phone },
                  { icon: <Home className="w-4 h-4 text-gray-400" />, label: 'Location', value: `${user.hostelName}${user.roomNumber ? `, Room ${user.roomNumber}` : ''}` },
                  { icon: <MapPin className="w-4 h-4 text-gray-400" />, label: 'Landmark', value: user.landmark || '—' },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3.5">
                    <div className="mt-0.5 flex-shrink-0">{icon}</div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="font-bold text-gray-900 text-sm mt-0.5 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Order items + notes ────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="font-black text-gray-900">Your Items</h2>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="divide-y divide-gray-50">
                {cartItems.map((item, index) => (
                  <div key={index} className="p-5">
                    {/* product row */}
                    <div className="flex gap-4 mb-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-gray-900 text-sm sm:text-base line-clamp-2">{item.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">by <span className="font-semibold text-gray-600">{item.sellerName}</span></p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-bata-primary font-black text-base">{formatPrice(item.price * item.quantity)}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-semibold">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Order note for this item ───────────────────── */}
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <div className="flex items-start gap-2.5 mb-3">
                        <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-amber-900">Note to Seller</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Let the seller know your preferences — size, color, variation, or any special request.
                            This will be sent directly to their notification.
                          </p>
                        </div>
                      </div>

                      <textarea
                        value={orderNotes[item.productId] || ''}
                        onChange={e => setOrderNotes(prev => ({ ...prev, [item.productId]: e.target.value }))}
                        placeholder={`e.g. "I'm 6ft tall, need a medium-size trouser. Please make sure it's the black one." or "Size 42 shoe, wider fit preferred."`}
                        rows={3}
                        maxLength={300}
                        className="w-full text-sm bg-white border border-amber-200 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 resize-none placeholder:text-gray-400 text-gray-800 font-medium"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Seller will be notified immediately
                        </p>
                        <p className="text-[11px] text-amber-500 font-semibold">
                          {(orderNotes[item.productId] || '').length}/300
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Escrow info ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-black text-gray-900">Secure Escrow Payment</h3>
              </div>
              <div className="space-y-2.5">
                {[
                  'Your payment is held securely in escrow until delivery',
                  'Seller gets paid only after you confirm delivery',
                  'Rider picks up and delivers within hours on campus',
                  'Rate both seller and rider after your order arrives',
                ].map(text => (
                  <div key={text} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600 font-medium">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">{error}</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Summary + CTA ─────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Order Summary</p>

              {/* line items */}
              <div className="space-y-3 pb-4 border-b border-gray-50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({cartItems.reduce((a, i) => a + i.quantity, 0)} units)</span>
                  <span className="font-bold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Delivery Fee
                  </span>
                  <span className="font-bold text-gray-900">{formatPrice(deliveryFee)}</span>
                </div>
              </div>

              <div className="flex justify-between mt-4 mb-5">
                <span className="font-black text-gray-900">Total</span>
                <span className="font-black text-bata-primary text-xl">{formatPrice(totalAmount)}</span>
              </div>

              {/* Note indicator */}
              {hasNotes && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 mb-4">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-amber-800">Order notes will be sent to seller(s)</p>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-bata-primary hover:bg-bata-dark disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black text-base shadow-lg shadow-bata-primary/25 hover:shadow-xl transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Pay Securely · {formatPrice(totalAmount)}</>
                )}
              </button>

              <p className="text-[11px] text-center text-gray-400 mt-3 leading-relaxed">
                By paying, you agree to BATA's Terms of Service. Payment secured by Paystack.
              </p>

              {/* Breakdown */}
              <div className="mt-5 pt-4 border-t border-gray-50">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Breakdown</p>
                <div className="space-y-2">
                  {[
                    { label: 'Seller receives', value: formatPrice(sellerAmount), color: 'text-emerald-600' },
                    { label: 'Rider receives', value: formatPrice(riderAmount), color: 'text-blue-600' },
                    { label: 'Platform fee', value: formatPrice(platformFee), color: 'text-gray-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-gray-400 font-medium">{label}</span>
                      <span className={`font-black ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-center gap-4">
                {[
                  { icon: <Lock className="w-3.5 h-3.5 text-gray-400" />, label: 'SSL Secured' },
                  { icon: <Shield className="w-3.5 h-3.5 text-gray-400" />, label: 'Escrow Protected' },
                  { icon: <CheckCircle className="w-3.5 h-3.5 text-gray-400" />, label: 'Verified' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    {icon}
                    <span className="text-[10px] text-gray-400 font-semibold">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}