// app/(marketplace)/rider-dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, AlertTriangle, MapPin, Phone, Package,
  CheckCircle2, Bike, ArrowRight, Clock, TrendingUp,
  WifiOff, Bell, ChevronRight, Star
} from 'lucide-react'

/* ─── tiny helper ─── */
const cls = (...args: (string | false | undefined | null)[]) =>
  args.filter(Boolean).join(' ')

/* ─── Status badge config ─── */
const STATUS_META: Record<string, { label: string; color: string }> = {
  RIDER_ASSIGNED: { label: 'Assigned',    color: 'bg-amber-100 text-amber-700' },
  PICKED_UP:      { label: 'Picked Up',   color: 'bg-blue-100 text-blue-700'   },
  ON_THE_WAY:     { label: 'On the Way',  color: 'bg-violet-100 text-violet-700'},
  DELIVERED:      { label: 'Delivered',   color: 'bg-emerald-100 text-emerald-700'},
}

export default function RiderDashboardPage() {
  const router = useRouter()
  const [rider,           setRider]           = useState<any>(null)
  const [availableOrders, setAvailableOrders] = useState<any[]>([])
  const [disputePickups,  setDisputePickups]  = useState<any[]>([])
  const [myDeliveries,    setMyDeliveries]    = useState<any[]>([])
  const [loading,         setLoading]         = useState(true)
  const [isAvailable,     setIsAvailable]     = useState(true)
  const [actionLoading,   setActionLoading]   = useState<Record<string, boolean>>({})
  const [activeTab,       setActiveTab]       = useState<'available' | 'active'>('available')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchRiderData()
  }, [])

  const fetchRiderData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [profileRes, ordersRes, deliveriesRes] = await Promise.all([
        fetch('/api/auth/me',                  { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/riders/available-orders',  { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/riders/my-deliveries',     { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const profileData   = await profileRes.json()
      const ordersData    = await ordersRes.json()
      const deliveriesData = await deliveriesRes.json()
      setRider(profileData.user)
      setAvailableOrders(ordersData.orders        || [])
      setDisputePickups(ordersData.disputePickups || [])
      setMyDeliveries(deliveriesData.deliveries   || [])
      setIsAvailable(profileData.user.isAvailable)
    } catch (err) {
      console.error('Error fetching rider data:', err)
    } finally {
      setLoading(false)
    }
  }

  const setLoaderFor = (key: string, val: boolean) =>
    setActionLoading(prev => ({ ...prev, [key]: val }))

  const toggleAvailability = async () => {
    if (actionLoading['toggle']) return
    setLoaderFor('toggle', true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/riders/toggle-availability', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setIsAvailable(p => !p)
      else alert('Failed to update availability')
    } catch { alert('Error updating availability') }
    finally { setLoaderFor('toggle', false) }
  }

  const acceptOrder = async (orderId: string) => {
    const key = `accept-${orderId}`
    if (actionLoading[key]) return
    setLoaderFor(key, true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/riders/accept-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (res.ok) { alert('Order accepted! Proceed to pickup.'); await fetchRiderData() }
      else alert(data.error || 'Failed to accept order')
    } catch { alert('Error accepting order') }
    finally { setLoaderFor(key, false) }
  }

  const updateStatus = async (orderId: string, status: string) => {
    const key = `status-${orderId}`
    if (actionLoading[key]) return
    setLoaderFor(key, true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/riders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, status }),
      })
      const data = await res.json()
      if (res.ok) await fetchRiderData()
      else alert(data.error || 'Failed to update status')
    } catch { alert('Error updating status') }
    finally { setLoaderFor(key, false) }
  }

  const markDisputePickedUp = async (orderId: string) => {
    const key = `dispute-pickup-${orderId}`
    if (actionLoading[key]) return
    setLoaderFor(key, true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/riders/dispute-picked-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (res.ok) { alert('Marked as picked up. Return the item to complete this job.'); await fetchRiderData() }
      else alert(data.error || 'Failed to update')
    } catch { alert('Error') }
    finally { setLoaderFor(key, false) }
  }

  const hasDisputePending = disputePickups.length > 0
  const estimatedEarnings = ((rider?.completedOrders || 0) * 560).toLocaleString()

  /* ─── Loading ─── */
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA] gap-4">
      <div className="w-14 h-14 rounded-2xl bg-[#5B3CF5] flex items-center justify-center shadow-lg shadow-[#5B3CF5]/30">
        <Bike className="w-7 h-7 text-white animate-pulse" />
      </div>
      <p className="text-sm text-gray-400 font-medium tracking-wide">Loading dashboard...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-[system-ui]">

      {/* ── TOP HERO HEADER ── */}
      <div className="relative bg-[#5B3CF5] overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-40px] right-[-40px] w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute bottom-[-60px] left-[-20px] w-64 h-64 rounded-full bg-white/5" />

        <div className="relative px-5 pt-12 pb-6">
          {/* Top row */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Rider Hub</p>
              <h1 className="text-white text-2xl font-bold leading-tight">
                Hey, {rider?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-white/50 text-sm mt-0.5">Let's get some deliveries done</p>
            </div>

            {/* Availability toggle */}
            <button
              onClick={toggleAvailability}
              disabled={actionLoading['toggle']}
              className={cls(
                'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg disabled:opacity-60',
                isAvailable
                  ? 'bg-emerald-400 text-white shadow-emerald-400/40'
                  : 'bg-white/20 text-white/70'
              )}
            >
              {actionLoading['toggle']
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <span className={cls('w-2 h-2 rounded-full', isAvailable ? 'bg-white' : 'bg-white/40')} />
              }
              {isAvailable ? 'Online' : 'Offline'}
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Completed', value: rider?.completedOrders || 0, icon: <CheckCircle2 className="w-4 h-4" />, accent: 'from-emerald-400/20 to-emerald-400/5' },
              { label: 'Active',    value: myDeliveries.length,         icon: <Bike          className="w-4 h-4" />, accent: 'from-sky-400/20 to-sky-400/5' },
              { label: 'Earnings',  value: `₦${estimatedEarnings}`,     icon: <TrendingUp    className="w-4 h-4" />, accent: 'from-amber-400/20 to-amber-400/5' },
            ].map(stat => (
              <div key={stat.label} className={cls('rounded-2xl bg-gradient-to-br p-3 border border-white/10 backdrop-blur-sm', stat.accent)}>
                <div className="text-white/50 mb-1">{stat.icon}</div>
                <p className="text-white font-bold text-lg leading-none">{stat.value}</p>
                <p className="text-white/50 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab switcher pinned to bottom of hero */}
        <div className="flex mx-5 mb-0 gap-1 bg-white/10 rounded-t-2xl p-1">
          {(['available', 'active'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cls(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize',
                activeTab === tab
                  ? 'bg-white text-[#5B3CF5] shadow-sm'
                  : 'text-white/60 hover:text-white/80'
              )}
            >
              {tab === 'available'
                ? `Available (${availableOrders.length})`
                : `My Deliveries (${myDeliveries.length})`
              }
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="px-5 py-5 max-w-2xl mx-auto space-y-4">

        {/* ─ DISPUTE PICKUP BANNER (always visible) ─ */}
        {hasDisputePending && (
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 overflow-hidden">
            <div className="px-4 py-3 bg-red-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
              <span className="text-white font-bold text-sm">Return Pickup Required</span>
              <span className="ml-auto bg-white text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {disputePickups.length} pending
              </span>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-red-700">
                Complete this return before accepting new orders. You'll earn <strong>₦560</strong> on delivery.
              </p>

              {disputePickups.map((order: any) => {
                const pickup = order.dispute?.pickupAddress as any
                return (
                  <div key={order.id} className="bg-white rounded-xl border border-red-100 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Dispute Return</span>
                        <p className="font-bold text-gray-900 mt-0.5">{order.product.name}</p>
                        <p className="text-xs text-gray-400">#{order.orderNumber}</p>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2.5 py-1 rounded-full">
                        ₦560 reward
                      </span>
                    </div>

                    {order.dispute?.reason && (
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                        <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Return reason</p>
                        <p>{order.dispute.reason}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2">
                      <AddressCard
                        icon={<MapPin className="w-3.5 h-3.5 text-blue-500" />}
                        title="Collect from buyer"
                        color="bg-blue-50 border-blue-100"
                        line1={pickup ? `${pickup.hostel}${pickup.room ? `, Room ${pickup.room}` : ''}` : `${order.deliveryHostel}, Room ${order.deliveryRoom}`}
                        line2={pickup?.landmark || order.deliveryLandmark}
                        phone={pickup?.phone || order.deliveryPhone}
                      />
                      <AddressCard
                        icon={<Package className="w-3.5 h-3.5 text-orange-500" />}
                        title="Return item to admin"
                        color="bg-orange-50 border-orange-100"
                        line1="Contact admin for drop-off location"
                      />
                    </div>

                    <ActionBtn
                      label="I've Collected the Item from Buyer"
                      loading={actionLoading[`dispute-pickup-${order.id}`]}
                      onClick={() => markDisputePickedUp(order.id)}
                      color="bg-red-500 hover:bg-red-600"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── AVAILABLE ORDERS TAB ─── */}
        {activeTab === 'available' && (
          <>
            {hasDisputePending && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                New orders locked until you complete the return pickup above.
              </div>
            )}

            {availableOrders.length === 0 ? (
              <EmptyState
                icon={<Bell className="w-8 h-8 text-gray-300" />}
                title="No orders right now"
                desc="New orders will appear here when available. Stay online!"
              />
            ) : (
              <div className="space-y-3">
                {availableOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className={cls(
                      'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all',
                      hasDisputePending && 'opacity-50 pointer-events-none'
                    )}
                  >
                    {/* Card header */}
                    <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                      <div>
                        <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2.5 py-0.5 rounded-full">NEW</span>
                        <p className="font-bold text-gray-900 mt-1.5">{order.product.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">#{order.orderNumber}</p>
                      </div>
                      <p className="text-sm font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
                        ₦560
                      </p>
                    </div>

                    {/* Route */}
                    <div className="mx-4 mb-3 p-3 bg-gray-50 rounded-xl flex items-center gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 font-semibold uppercase">Pickup</p>
                        <p className="text-gray-700 font-medium truncate">{order.product.hostelName}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-xs text-gray-400 font-semibold uppercase">Drop-off</p>
                        <p className="text-gray-700 font-medium truncate">{order.deliveryHostel}</p>
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      <ActionBtn
                        label="Accept Order"
                        loading={actionLoading[`accept-${order.id}`]}
                        onClick={() => acceptOrder(order.id)}
                        color="bg-[#5B3CF5] hover:bg-[#4a31d4]"
                        icon={<ChevronRight className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── MY ACTIVE DELIVERIES TAB ─── */}
        {activeTab === 'active' && (
          <>
            {myDeliveries.length === 0 ? (
              <EmptyState
                icon={<Bike className="w-8 h-8 text-gray-300" />}
                title="No active deliveries"
                desc="Accept an order to get started on your next delivery."
              />
            ) : (
              <div className="space-y-3">
                {myDeliveries.map((delivery: any) => {
                  const meta = STATUS_META[delivery.status] ?? { label: delivery.status, color: 'bg-gray-100 text-gray-600' }
                  return (
                    <div key={delivery.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Progress bar */}
                      <DeliveryProgress status={delivery.status} />

                      <div className="px-4 pt-3 pb-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-gray-900">{delivery.product.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">#{delivery.orderNumber}</p>
                          </div>
                          <span className={cls('text-xs font-bold px-2.5 py-1 rounded-full', meta.color)}>
                            {meta.label}
                          </span>
                        </div>

                        {/* Addresses */}
                        <div className="grid grid-cols-2 gap-2">
                          <AddressCard
                            icon={<MapPin className="w-3.5 h-3.5 text-[#5B3CF5]" />}
                            title="Pickup"
                            color="bg-violet-50 border-violet-100"
                            line1={delivery.product.hostelName}
                            phone={delivery.seller.phone}
                          />
                          <AddressCard
                            icon={<MapPin className="w-3.5 h-3.5 text-emerald-500" />}
                            title="Drop-off"
                            color="bg-emerald-50 border-emerald-100"
                            line1={`${delivery.deliveryHostel}, ${delivery.deliveryRoom}`}
                            phone={delivery.deliveryPhone}
                          />
                        </div>

                        {/* CTA button per status */}
                        {delivery.status === 'RIDER_ASSIGNED' && (
                          <ActionBtn
                            label="Mark as Picked Up"
                            loading={actionLoading[`status-${delivery.id}`]}
                            onClick={() => updateStatus(delivery.id, 'PICKED_UP')}
                            color="bg-blue-500 hover:bg-blue-600"
                          />
                        )}
                        {delivery.status === 'PICKED_UP' && (
                          <ActionBtn
                            label="I'm On My Way"
                            loading={actionLoading[`status-${delivery.id}`]}
                            onClick={() => updateStatus(delivery.id, 'ON_THE_WAY')}
                            color="bg-violet-500 hover:bg-violet-600"
                            icon={<Bike className="w-4 h-4" />}
                          />
                        )}
                        {delivery.status === 'ON_THE_WAY' && (
                          <ActionBtn
                            label="Mark as Delivered 🎉"
                            loading={actionLoading[`status-${delivery.id}`]}
                            onClick={() => updateStatus(delivery.id, 'DELIVERED')}
                            color="bg-emerald-500 hover:bg-emerald-600"
                            icon={<CheckCircle2 className="w-4 h-4" />}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */

function AddressCard({
  icon, title, color, line1, line2, phone
}: {
  icon: React.ReactNode
  title: string
  color: string
  line1?: string
  line2?: string
  phone?: string
}) {
  return (
    <div className={`p-2.5 rounded-xl border ${color} flex-1`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{title}</span>
      </div>
      {line1 && <p className="text-xs font-semibold text-gray-800 leading-tight">{line1}</p>}
      {line2 && <p className="text-xs text-gray-500 mt-0.5">{line2}</p>}
      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-1 mt-1 text-xs text-blue-600 font-medium">
          <Phone className="w-3 h-3" />
          {phone}
        </a>
      )}
    </div>
  )
}

function ActionBtn({
  label, loading, onClick, color, icon
}: {
  label: string
  loading?: boolean
  onClick: () => void
  color: string
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${color}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {loading ? 'Updating...' : label}
    </button>
  )
}

function DeliveryProgress({ status }: { status: string }) {
  const steps = ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED']
  const current = steps.indexOf(status)
  const pct = current < 0 ? 0 : Math.round(((current + 1) / steps.length) * 100)

  const colors: Record<string, string> = {
    RIDER_ASSIGNED: 'bg-amber-400',
    PICKED_UP:      'bg-blue-500',
    ON_THE_WAY:     'bg-violet-500',
    DELIVERED:      'bg-emerald-500',
  }

  return (
    <div className="h-1 bg-gray-100 w-full">
      <div
        className={`h-full transition-all duration-500 ${colors[status] ?? 'bg-gray-300'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {icon}
      <p className="font-bold text-gray-500">{title}</p>
      <p className="text-sm text-gray-400 max-w-xs">{desc}</p>
    </div>
  )
}