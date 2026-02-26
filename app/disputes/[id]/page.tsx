// app/disputes/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Shield, AlertCircle, Send, Loader2, Truck, RotateCcw, Package } from 'lucide-react'

interface DisputeMessage {
  id: string
  message: string
  senderType: string
  attachments: string[]
  createdAt: string
}

interface Dispute {
  id: string
  status: string
  reason: string
  resolutionPreference?: string
  buyerEvidence: string[]
  resolution: string | null
  refundAmount: number | null
  createdAt: string
  updatedAt: string
  order: {
    id: string
    orderNumber: string
    totalAmount: number
    product: {
      name: string
      images: string[]
    }
  }
  buyer: {
    id: string
    name: string
    profilePhoto: string | null
  }
  messages: DisputeMessage[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN:                    { label: 'Open — Under Review',     color: 'bg-blue-100 text-blue-800' },
  UNDER_REVIEW:            { label: 'Under Review',            color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED_BUYER_FAVOR:    { label: 'Resolved — Refund Issued', color: 'bg-green-100 text-green-800' },
  RESOLVED_SELLER_FAVOR:   { label: 'Resolved — No Refund',    color: 'bg-purple-100 text-purple-800' },
  RESOLVED_COMPROMISE:     { label: 'Resolved — Partial Refund', color: 'bg-orange-100 text-orange-800' },
  DISMISSED:               { label: 'Dismissed',               color: 'bg-gray-100 text-gray-800' },
}

const RESOLUTION_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  REFUND_WITH_PICKUP: { label: 'Refund + Return Item',        icon: Truck },
  EXCHANGE:           { label: 'Exchange / Replacement',       icon: RotateCcw },
  PARTIAL_REFUND:     { label: 'Partial Refund (Keep Item)',   icon: Package },
}

export default function DisputeDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const disputeId = params.id as string

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    fetchDispute()
  }, [disputeId])

  const fetchDispute = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/disputes/${disputeId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setDispute(data.dispute)
      } else {
        setError('Dispute not found')
      }
    } catch {
      setError('Failed to load dispute')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setSending(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage }),
      })

      if (response.ok) {
        setNewMessage('')
        await fetchDispute()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send message')
      }
    } catch {
      setError('An error occurred')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    )
  }

  if (!dispute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dispute Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/orders')}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium"
          >
            Back to Orders
          </button>
        </div>
      </div>
    )
  }

  const isResolved = dispute.status.startsWith('RESOLVED_') || dispute.status === 'DISMISSED'
  const statusInfo = STATUS_CONFIG[dispute.status] ?? { label: dispute.status, color: 'bg-gray-100 text-gray-800' }
  const preferenceInfo = dispute.resolutionPreference ? RESOLUTION_LABELS[dispute.resolutionPreference] : null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header card */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Dispute #{dispute.id.slice(-8).toUpperCase()}
                </h1>
                <p className="text-sm text-gray-500">Order #{dispute.order.orderNumber}</p>
              </div>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Product info */}
          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg mb-4">
            <img
              src={dispute.order.product.images[0] || '/placeholder.png'}
              alt={dispute.order.product.name}
              className="w-16 h-16 object-cover rounded"
            />
            <div>
              <p className="font-bold text-gray-900">{dispute.order.product.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Order value: ₦{dispute.order.totalAmount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Opened {new Date(dispute.createdAt).toLocaleDateString('en-NG', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Buyer's stated problem */}
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg mb-4">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
              Your complaint
            </p>
            <p className="text-sm text-gray-800">{dispute.reason}</p>
          </div>

          {/* Requested resolution */}
          {preferenceInfo && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <preferenceInfo.icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                  Requested resolution
                </p>
                <p className="text-sm font-medium text-blue-900">{preferenceInfo.label}</p>
              </div>
            </div>
          )}

          {/* Resolution outcome */}
          {isResolved && dispute.resolution && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                Admin decision
              </p>
              <p className="text-sm text-green-900">{dispute.resolution}</p>
              {dispute.refundAmount != null && dispute.refundAmount > 0 && (
                <p className="mt-2 font-bold text-green-800">
                  Refund: ₦{dispute.refundAmount.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Messages with Support</h2>
          <p className="text-xs text-gray-400 mb-4">
            This conversation is between you and our admin team only.
          </p>

          {/* Messages */}
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
            {dispute.messages.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">No messages yet.</p>
                <p className="text-xs mt-1">Send a message to the support team below.</p>
              </div>
            ) : (
              dispute.messages.map((msg) => {
                const isFromAdmin = msg.senderType === 'ADMIN'
                const isBuyerMsg = msg.senderType === 'BUYER'

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isBuyerMsg ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-sm px-4 py-3 rounded-2xl ${
                      isBuyerMsg
                        ? 'bg-orange-500 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}>
                      {isFromAdmin && (
                        <p className="text-xs font-bold mb-1 text-gray-500">Support Team</p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isBuyerMsg ? 'text-orange-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('en-NG', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}

          {/* Input */}
          {!isResolved ? (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message to support..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-gray-400 py-2">
              This dispute has been closed. No further messages can be sent.
            </p>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong className="block mb-1">What's happening?</strong>
          <ul className="space-y-1">
            <li>• Our admin team is reviewing your case</li>
            <li>• We'll message you here if we need more information</li>
            <li>• Final decision within 3–5 business days</li>
            {!isResolved && dispute.resolutionPreference === 'REFUND_WITH_PICKUP' && (
              <li>• If approved, a rider will be sent to collect the item before your refund is processed</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}