// app/(admin)/admin/revenue/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Package, Clock, Users, Truck, AlertCircle } from 'lucide-react'

export default function RevenuePage() {
  const [revenue, setRevenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRevenue()
  }, [])

  const fetchRevenue = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/revenue', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setRevenue(data.revenue)
      }
    } catch (error) {
      console.error('Failed to fetch revenue:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
      </div>
    )
  }

  const p = revenue?.platform || {}
  const gross = p.gross || {}
  const net = p.net || {}
  const paystackFees = p.paystackFees || {}
  const escrow = revenue?.escrow || {}
  const obligations = revenue?.obligations || {}

  return (
    <div className="space-y-8">

      {/* ── YOUR NET PLATFORM EARNINGS ── */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">💰 Your Net Platform Profit</h2>
        <p className="text-gray-400 text-sm mb-4">
          After Paystack fees (1.5% + ₦100 per order). This is what you actually keep.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
            <p className="text-green-100 text-sm mb-1">All Time Net Profit</p>
            <p className="text-3xl font-bold">₦{(net.allTime || 0).toLocaleString()}</p>
            <p className="text-green-100 text-xs mt-2">
              Gross: ₦{(gross.allTime || 0).toLocaleString()} - Paystack: ₦{(paystackFees.allTime || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <p className="text-blue-100 text-sm mb-1">This Month</p>
            <p className="text-3xl font-bold">₦{(net.thisMonth || 0).toLocaleString()}</p>
            <p className="text-blue-100 text-xs mt-2">{revenue?.thisMonth?.orders || 0} orders</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
            <p className="text-purple-100 text-sm mb-1">Last Month</p>
            <p className="text-3xl font-bold">₦{(net.lastMonth || 0).toLocaleString()}</p>
            <p className="text-purple-100 text-xs mt-2">{revenue?.lastMonth?.orders || 0} orders</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white">
            <p className="text-yellow-100 text-sm mb-1">Today</p>
            <p className="text-3xl font-bold">₦{(net.today || 0).toLocaleString()}</p>
            <p className="text-yellow-100 text-xs mt-2">{revenue?.today?.orders || 0} orders</p>
          </div>
        </div>
      </div>

      {/* ── HOW MUCH TO WITHDRAW FROM PAYSTACK ── */}
      <div className="bg-gray-800 border-2 border-green-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <DollarSign className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">How Much Can You Withdraw?</h2>
            <p className="text-gray-400 text-sm mt-1">
              Go to your Paystack dashboard → Settlements → Transfer to your bank
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Your NET profit (after Paystack)</p>
            <p className="text-2xl font-bold text-green-400">₦{(net.allTime || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Safe to withdraw now</p>
          </div>

          <div className="bg-gray-700/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Pending (in escrow)</p>
            <p className="text-2xl font-bold text-yellow-400">₦{(net.pending || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">From {escrow.pendingOrders || 0} active orders</p>
          </div>

          <div className="bg-gray-700/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Owed to sellers & riders</p>
            <p className="text-2xl font-bold text-red-400">
              ₦{((obligations.totalOwedToSellers || 0) + (obligations.totalOwedToRiders || 0)).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Do NOT touch</p>
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <p className="text-green-300 font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Safe withdrawal amount:
          </p>
          <p className="text-white font-bold text-lg mt-1">
            Withdraw exactly ₦{(net.allTime || 0).toLocaleString()} from Paystack
          </p>
          <p className="text-gray-400 text-xs mt-1">
            This is your NET profit after Paystack fees. Leaves enough for seller/rider withdrawals.
          </p>
        </div>
      </div>

      {/* ── PAYSTACK FEES BREAKDOWN ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Paystack Fees Paid</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-red-500/10 rounded-xl">
            <p className="text-2xl font-bold text-red-400">₦{(paystackFees.allTime || 0).toLocaleString()}</p>
            <p className="text-gray-400 text-sm mt-1">All time</p>
          </div>
          <div className="text-center p-4 bg-red-500/10 rounded-xl">
            <p className="text-2xl font-bold text-red-400">₦{(paystackFees.thisMonth || 0).toLocaleString()}</p>
            <p className="text-gray-400 text-sm mt-1">This month</p>
          </div>
          <div className="text-center p-4 bg-red-500/10 rounded-xl">
            <p className="text-2xl font-bold text-red-400">₦{(paystackFees.lastMonth || 0).toLocaleString()}</p>
            <p className="text-gray-400 text-sm mt-1">Last month</p>
          </div>
          <div className="text-center p-4 bg-red-500/10 rounded-xl">
            <p className="text-2xl font-bold text-red-400">₦{(paystackFees.today || 0).toLocaleString()}</p>
            <p className="text-gray-400 text-sm mt-1">Today</p>
          </div>
        </div>
        <p className="text-gray-400 text-xs mt-3 text-center">
          Paystack charges 1.5% + ₦100 per transaction, capped at ₦2,000
        </p>
      </div>

      {/* ── OBLIGATIONS BREAKDOWN ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Seller Obligations</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400 text-sm">Available (can withdraw)</span>
              <span className="text-green-400 font-bold">₦{(obligations.sellersAvailableNow || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400 text-sm">In escrow (pending)</span>
              <span className="text-yellow-400 font-bold">
                ₦{((obligations.totalOwedToSellers || 0) - (obligations.sellersAvailableNow || 0)).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-white font-semibold text-sm">Total owed to sellers</span>
              <span className="text-white font-bold">₦{(obligations.totalOwedToSellers || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Truck className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Rider Obligations</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400 text-sm">Available (can withdraw)</span>
              <span className="text-green-400 font-bold">₦{(obligations.ridersAvailableNow || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400 text-sm">In escrow (pending)</span>
              <span className="text-yellow-400 font-bold">
                ₦{((obligations.totalOwedToRiders || 0) - (obligations.ridersAvailableNow || 0)).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-white font-semibold text-sm">Total owed to riders</span>
              <span className="text-white font-bold">₦{(obligations.totalOwedToRiders || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP SELLERS ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Top Sellers by Revenue</h2>
        <div className="space-y-3">
          {revenue?.topSellers?.length > 0 ? (
            revenue.topSellers.map((seller: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{seller.name}</p>
                    <p className="text-sm text-gray-400">{seller.totalOrders} completed orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-400">₦{seller.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">
                    Your cut: <span className="text-yellow-400">₦{seller.platformEarned.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-4">No completed orders yet</p>
          )}
        </div>
      </div>

    </div>
  )
}