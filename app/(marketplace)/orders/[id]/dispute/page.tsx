// app/(marketplace)/orders/[id]/dispute/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Shield, Upload, AlertCircle, Truck, MapPin, Phone } from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  totalAmount: number
  product: { name: string; images: string[] }
  seller: { name: string }
  status: string
  deliveredAt: string | null
  deliveryHostel: string
  deliveryRoom: string
  deliveryLandmark: string
  deliveryPhone: string
  dispute?: { id: string; status: string; createdAt: string }
}

export default function OpenDisputePage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    reason: '',
    resolutionPreference: 'REFUND_WITH_PICKUP',
    evidence: [] as string[],
    pickupHostel: '',
    pickupRoom: '',
    pickupLandmark: '',
    pickupPhone: '',
  })

  useEffect(() => { fetchOrder() }, [orderId])

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        if (data.dispute) setError('This order already has an open dispute.')
        setOrder(data)
        // Pre-fill from original delivery address
        setFormData(prev => ({
          ...prev,
          pickupHostel:   data.deliveryHostel   || '',
          pickupRoom:     data.deliveryRoom      || '',
          pickupLandmark: data.deliveryLandmark  || '',
          pickupPhone:    data.deliveryPhone     || '',
        }))
      } else {
        setError('Order not found')
      }
    } catch {
      setError('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.pickupPhone.trim()) {
      setError('Please provide a contact number for the rider pickup.')
      return
    }
    setSubmitting(true)
    setError('')
    if (order?.dispute) {
      setError('This order already has a dispute.')
      setSubmitting(false)
      return
    }
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          orderId,
          reason: formData.reason,
          resolutionPreference: formData.resolutionPreference,
          evidence: formData.evidence,
          pickupAddress: {
            hostel:   formData.pickupHostel,
            room:     formData.pickupRoom,
            landmark: formData.pickupLandmark,
            phone:    formData.pickupPhone,
          },
        }),
      })
      const data = await response.json()
      if (response.ok) {
        router.push(`/disputes/${data.dispute.id}`)
      } else {
        setError(data.error || 'Failed to open dispute')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : null
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const isValidStatus = ['DELIVERED', 'COMPLETED'].includes(order.status)
  const isWithinTimeWindow = deliveredDate ? deliveredDate > sevenDaysAgo : false
  const canDispute = deliveredDate && isWithinTimeWindow && isValidStatus

  if (!canDispute) {
    let msg = ''
    if (!isValidStatus) msg = 'Only delivered or completed orders can be disputed.'
    else if (!deliveredDate) msg = 'Order delivery date is not set. Please contact support.'
    else if (!isWithinTimeWindow) msg = 'Dispute window has expired (must be within 7 days of delivery).'
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-lg">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cannot Open Dispute</h2>
          <p className="text-gray-600 mb-6">{msg}</p>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left">
            <p className="text-sm text-gray-600 mb-1"><strong>Order Status:</strong> {order.status}</p>
            <p className="text-sm text-gray-600">
              <strong>Delivered At:</strong> {deliveredDate ? deliveredDate.toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <button onClick={() => router.back()} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-red-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Open a Dispute</h1>
              <p className="text-sm text-gray-600">Order #{order.orderNumber}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg flex gap-4">
            <img
              src={order.product.images[0] || '/placeholder.png'}
              alt={order.product.name}
              className="w-20 h-20 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{order.product.name}</h3>
              <p className="text-sm font-bold text-orange-600 mt-1">₦{order.totalAmount.toLocaleString()}</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Notice */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <strong>Please note:</strong> Since items are inspected on delivery, a <strong>10% processing fee</strong> applies. Disputes are reviewed by our admin team only — your concern stays private.
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Problem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe the problem *
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent min-h-36 resize-none"
                placeholder="What went wrong? Be specific — wrong item, damaged, fake, etc."
                required
              />
            </div>

            {/* Resolution — fixed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Resolution</label>
              <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-orange-500 bg-orange-50">
                <div className="p-2 rounded-lg mt-0.5 bg-orange-100">
                  <Truck className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-orange-900">Refund + Return Item</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    A rider will be sent to your address to collect the item, then your refund is processed.
                  </p>
                  <p className="text-xs text-orange-700 mt-2 font-medium bg-orange-100 px-2 py-1 rounded">
                    ⚠️ A 10% processing fee applies since the item was accepted on delivery.
                  </p>
                </div>
              </div>
            </div>

            {/* Pickup address */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Confirm Pickup Address</label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Pre-filled from your delivery address. Update if the rider should come somewhere different.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hostel / Area *</label>
                    <input
                      type="text"
                      value={formData.pickupHostel}
                      onChange={(e) => setFormData({ ...formData, pickupHostel: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g. Moremi Hall"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Room Number *</label>
                    <input
                      type="text"
                      value={formData.pickupRoom}
                      onChange={(e) => setFormData({ ...formData, pickupRoom: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g. 204"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Landmark</label>
                  <input
                    type="text"
                    value={formData.pickupLandmark}
                    onChange={(e) => setFormData({ ...formData, pickupLandmark: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="e.g. Near the main gate"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Contact Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.pickupPhone}
                    onChange={(e) => setFormData({ ...formData, pickupPhone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Phone number for rider to call"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Evidence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Evidence (optional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Photos or screenshots help speed up your case</p>
                <p className="text-xs text-gray-400 mt-1">Coming soon</p>
              </div>
            </div>

            {/* What happens next */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <strong className="block mb-2">What happens next?</strong>
              <ul className="space-y-1">
                <li>• Your dispute goes directly to our admin team</li>
                <li>• A rider will be dispatched to your address to collect the item</li>
                <li>• Your refund is processed once the item is received</li>
                <li>• Decision within 3–5 business days</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold disabled:opacity-50 transition-colors"
                disabled={submitting || !!order.dispute}
              >
                {submitting ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}