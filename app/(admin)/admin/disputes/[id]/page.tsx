// app/(admin)/admin/disputes/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle, User, DollarSign, MessageSquare,
  Truck, Send, Loader2, CheckCircle, Package, Phone
} from 'lucide-react'

const PROCESSING_FEE = 0.10

function getPickupStage(dispute: any): 'INITIAL' | 'RIDER_SENT' | 'ITEM_RECEIVED' | 'REFUND_RELEASED' | 'FULLY_DONE' {
  if (!dispute) return 'INITIAL'
  if (dispute.status === 'RESOLVED_BUYER_FAVOR' && dispute.resolvedAt) return 'FULLY_DONE'
  if (dispute.resolution === '__REFUND_RELEASED__') return 'REFUND_RELEASED'
  if (dispute.resolution === '__RIDER_PAID__') return 'ITEM_RECEIVED'  // rider paid, refund still pending
  if (dispute.resolution === '__ITEM_RECEIVED__') return 'ITEM_RECEIVED'
  if (dispute.resolution === '__AWAITING_PICKUP__') return 'RIDER_SENT'
  return 'INITIAL'
}

export default function AdminDisputeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const disputeId = params.id as string

  const [dispute, setDispute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [sendingMsg, setSendingMsg] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [actionFeedback, setActionFeedback] = useState('')

  const [resolution, setResolution] = useState({
    status: 'RESOLVED_SELLER_FAVOR',
    resolution: '',
    penalizeBuyer: false,
    penaltyReason: '',
  })
  const [resolving, setResolving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const [disputeRes, msgRes] = await Promise.all([
        fetch(`/api/admin/disputes/${disputeId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/disputes/${disputeId}/messages`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ])
      if (disputeRes.ok) {
        const data = await disputeRes.json()
        setDispute(data.dispute)
      }
      if (msgRes.ok) {
        const data = await msgRes.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const doPickupAction = async (action: string) => {
    setActionLoading(action)
    setActionFeedback('')
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`/api/admin/disputes/${disputeId}/pickup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      setActionFeedback(res.ok ? data.message : `Error: ${data.error}`)
      if (res.ok) await fetchAll()
    } catch {
      setActionFeedback('Something went wrong.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminMessage.trim()) return
    setSendingMsg(true)
    try {
      const token = localStorage.getItem('adminToken')
      await fetch(`/api/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: adminMessage }),
      })
      setAdminMessage('')
      await fetchAll()
    } catch (err) { console.error(err) }
    finally { setSendingMsg(false) }
  }

  const handleDirectResolve = async () => {
    if (!resolution.resolution.trim()) {
      alert('Please write a resolution message for the buyer.')
      return
    }
    setResolving(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...resolution, refundAmount: 0 }),
      })
      if (res.ok) await fetchAll()
      else { const d = await res.json(); alert(d.error || 'Failed') }
    } catch { alert('Error occurred') }
    finally { setResolving(false) }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
      </div>
    )
  }

  if (!dispute) return <div className="text-center py-12 text-gray-400">Dispute not found</div>

  const stage = getPickupStage(dispute)
  const rider = dispute.order?.rider
  const orderTotal = dispute.order?.totalAmount || 0
  const processingFee = Math.round(orderTotal * PROCESSING_FEE * 100) / 100
  const netRefund = Math.round((orderTotal - processingFee) * 100) / 100
  const isFullyDone = stage === 'FULLY_DONE' || ['RESOLVED_SELLER_FAVOR', 'DISMISSED'].includes(dispute.status)

  const stages = ['INITIAL', 'RIDER_SENT', 'ITEM_RECEIVED', 'REFUND_RELEASED', 'FULLY_DONE']
  const currentStageIndex = stages.indexOf(stage)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-orange-500/10 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dispute #{dispute.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-gray-400 text-sm">Order #{dispute.order?.orderNumber}</p>
          </div>
          <span className={`ml-auto px-3 py-1.5 rounded-full text-xs font-semibold ${
            isFullyDone ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
          }`}>
            {isFullyDone ? 'Resolved' : dispute.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-blue-400" />
              <p className="text-gray-400 text-xs uppercase tracking-wide">Buyer</p>
            </div>
            <p className="text-white font-semibold">{dispute.buyer?.name}</p>
            <p className="text-gray-400 text-sm">{dispute.buyer?.email}</p>
          </div>

          <div className="p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-yellow-400" />
              <p className="text-gray-400 text-xs uppercase tracking-wide">Order Amount</p>
            </div>
            <p className="text-white font-semibold text-xl">₦{orderTotal.toLocaleString()}</p>
            <p className="text-gray-500 text-xs mt-1">After 10% fee → buyer gets ₦{netRefund.toLocaleString()}</p>
          </div>

          <div className="p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-purple-400" />
              <p className="text-gray-400 text-xs uppercase tracking-wide">Original Rider</p>
            </div>
            {rider ? (
              <>
                <p className="text-white font-semibold">{rider.name}</p>
                <p className="text-gray-400 text-sm flex items-center gap-1">
                  <Phone className="w-3 h-3" />{rider.phone}
                </p>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No rider on record</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-700/30 rounded-xl mb-4">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Buyer's Complaint</p>
          <p className="text-white">{dispute.reason}</p>
        </div>

        {/* Fee breakdown */}
        <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 text-sm space-y-1.5">
          <div className="flex justify-between text-gray-400">
            <span>Order total</span><span>₦{orderTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-orange-400">
            <span>Processing fee (10%)</span><span>− ₦{processingFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-green-400 font-bold border-t border-gray-700 pt-1.5">
            <span>Buyer receives</span><span>₦{netRefund.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-blue-400">
            <span>Rider pickup pay</span><span>₦560</span>
          </div>
        </div>
      </div>

      {/* ── Action panel ──────────────────────────────────────────────────── */}
      {!isFullyDone && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5">Actions</h2>

          {actionFeedback && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
              actionFeedback.startsWith('Error')
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-green-500/10 text-green-400 border border-green-500/20'
            }`}>
              {actionFeedback}
            </div>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {[
              { key: 'INITIAL',         label: '1. Send Rider'      },
              { key: 'RIDER_SENT',      label: '2. Await Pickup'    },
              { key: 'ITEM_RECEIVED',   label: '3. Confirm Receipt' },
              { key: 'REFUND_RELEASED', label: '4. Release Payout'  },
            ].map((step, i, arr) => {
              const stepIndex = stages.indexOf(step.key)
              const done   = currentStageIndex > stepIndex
              const active = currentStageIndex === stepIndex
              return (
                <div key={step.key} className="flex items-center gap-2 flex-shrink-0">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    done   ? 'bg-green-500/20 text-green-400' :
                    active ? 'bg-yellow-500/20 text-yellow-400' :
                             'bg-gray-700 text-gray-500'
                  }`}>
                    {done && <CheckCircle className="w-3 h-3" />}
                    {step.label}
                  </div>
                  {i < arr.length - 1 && <span className="text-gray-600 text-xs">→</span>}
                </div>
              )
            })}
          </div>

          {/* STEP 1 — Send rider */}
          {stage === 'INITIAL' && (
            <div className="space-y-4">
              {rider ? (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <Truck className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">Send original rider to collect item</p>
                      <p className="text-gray-400 text-sm mt-1">
                        <span className="text-blue-300 font-medium">{rider.name}</span> ({rider.phone}) will
                        receive a notification to go back to the buyer and collect the item. They'll earn ₦560 once confirmed.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => doPickupAction('send_rider')}
                    disabled={actionLoading === 'send_rider'}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'send_rider'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Notifying Rider...</>
                      : <><Truck className="w-4 h-4" /> Notify Rider to Collect Item</>
                    }
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  No rider is linked to this order. You may need to arrange pickup manually.
                </div>
              )}

              {/* Collapse for dismiss/favour seller */}
              <details className="group">
                <summary className="text-gray-400 text-sm cursor-pointer hover:text-gray-300 select-none py-2">
                  Or resolve without pickup (dismiss / no refund) ▾
                </summary>
                <div className="mt-3 space-y-4 pt-4 border-t border-gray-700">
                  <select
                    value={resolution.status}
                    onChange={(e) => setResolution({ ...resolution, status: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="RESOLVED_SELLER_FAVOR">No Refund (Favour Seller)</option>
                    <option value="DISMISSED">Dismiss</option>
                  </select>
                  <textarea
                    value={resolution.resolution}
                    onChange={(e) => setResolution({ ...resolution, resolution: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-24 resize-none"
                    placeholder="Explain your decision to the buyer..."
                  />
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resolution.penalizeBuyer}
                      onChange={(e) => setResolution({ ...resolution, penalizeBuyer: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 text-red-500"
                    />
                    <span className="text-gray-300 text-sm">Issue warning to buyer (false dispute)</span>
                  </label>
                  <button
                    onClick={handleDirectResolve}
                    disabled={resolving}
                    className="w-full px-5 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    {resolving ? 'Resolving...' : 'Submit Resolution'}
                  </button>
                </div>
              </details>
            </div>
          )}

          {/* STEP 2 — Waiting for pickup */}
          {stage === 'RIDER_SENT' && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Truck className="w-5 h-5 text-yellow-400" />
                  <p className="text-yellow-300 font-semibold">
                    Waiting for {rider?.name || 'rider'} to collect the item
                  </p>
                </div>
                <p className="text-gray-400 text-sm">
                  Once you physically have the item, click below to unlock the payout buttons.
                </p>
              </div>
              <button
                onClick={() => doPickupAction('confirm_received')}
                disabled={actionLoading === 'confirm_received'}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {actionLoading === 'confirm_received'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
                  : <><CheckCircle className="w-4 h-4" /> I Have Received the Item</>
                }
              </button>
            </div>
          )}

          {/* STEP 3 — Release refund + rider pay (two independent buttons) */}
          {(stage === 'ITEM_RECEIVED' || stage === 'REFUND_RELEASED') && (
            <div className="space-y-4">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Item confirmed received. Release payments below.
              </div>

              {/* Refund to buyer */}
              <div className={`p-4 rounded-xl border ${
                stage === 'REFUND_RELEASED'
                  ? 'bg-gray-700/10 border-gray-700 opacity-50'
                  : 'bg-gray-700/30 border-gray-600'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      Release Refund to Buyer
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      ₦{netRefund.toLocaleString()} → {dispute.buyer?.name}'s wallet
                      <span className="text-gray-600 text-xs ml-2">(₦{processingFee.toLocaleString()} fee kept)</span>
                    </p>
                  </div>
                  {stage === 'REFUND_RELEASED' ? (
                    <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold flex-shrink-0">
                      ✓ Released
                    </span>
                  ) : (
                    <button
                      onClick={() => doPickupAction('release_refund')}
                      disabled={actionLoading === 'release_refund'}
                      className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      {actionLoading === 'release_refund'
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : `Release ₦${netRefund.toLocaleString()}`
                      }
                    </button>
                  )}
                </div>
              </div>

              {/* Rider pay */}
              <div className="p-4 bg-gray-700/30 border border-gray-600 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-400" />
                      Release Rider Pickup Pay
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      ₦560 → {rider?.name}'s wallet
                    </p>
                  </div>
                  <button
                    onClick={() => doPickupAction('release_rider_pay')}
                    disabled={actionLoading === 'release_rider_pay'}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'release_rider_pay'
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : 'Release ₦560'
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Resolved summary ──────────────────────────────────────────────── */}
      {isFullyDone && (
        <div className="bg-gray-800 border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">Dispute Resolved</h2>
          </div>
          <p className="text-gray-400">
            Status: <span className="text-white font-semibold">{dispute.status.replace(/_/g, ' ')}</span>
          </p>
          {dispute.refundAmount > 0 && (
            <p className="text-gray-400 mt-1">
              Refund paid: <span className="text-green-400 font-semibold">₦{dispute.refundAmount.toLocaleString()}</span>
            </p>
          )}
        </div>
      )}

      {/* ── Chat ──────────────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Chat with Buyer</h2>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto mb-4 pr-1">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No messages yet</p>
          ) : (
            messages.map((msg: any) => {
              const isAdmin = msg.senderType === 'ADMIN'
              return (
                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-4 py-3 rounded-2xl text-sm ${
                    isAdmin ? 'bg-red-500/80 text-white rounded-br-sm' : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                  }`}>
                    <p className="text-xs opacity-60 mb-1 font-semibold">{isAdmin ? 'You (Admin)' : 'Buyer'}</p>
                    <p>{msg.message}</p>
                    <p className="text-xs opacity-40 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {!isFullyDone && (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Message the buyer..."
              className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={sendingMsg}
            />
            <button
              type="submit"
              disabled={sendingMsg || !adminMessage.trim()}
              className="px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </form>
        )}
      </div>

    </div>
  )
}