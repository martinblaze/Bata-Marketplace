// app/(admin)/admin/analytics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, Package, ShoppingBag, DollarSign } from 'lucide-react'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7days')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
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

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {['7days', '30days', '90days', 'all'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              timeRange === range
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            {range === 'all' ? 'All Time' : range.replace('days', ' Days')}
          </button>
        ))}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-sm text-gray-400">{timeRange}</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {analytics?.newUsers || 0}
          </p>
          <p className="text-gray-400 text-sm">New Users</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <Package className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-sm text-gray-400">{timeRange}</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {analytics?.newProducts || 0}
          </p>
          <p className="text-gray-400 text-sm">New Products</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-sm text-gray-400">{timeRange}</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {analytics?.totalOrders || 0}
          </p>
          <p className="text-gray-400 text-sm">Total Orders</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-sm text-gray-400">{timeRange}</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            ₦{(analytics?.revenue || 0).toLocaleString()}
          </p>
          <p className="text-gray-400 text-sm">Revenue</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Top Categories</h2>
        <div className="space-y-4">
          {analytics?.topCategories?.map((cat: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{cat.category}</span>
                  <span className="text-gray-400">{cat.count} products</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full"
                    style={{ width: `${(cat.count / analytics.totalProducts) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )) || <p className="text-gray-400 text-center py-4">No data available</p>}
        </div>
      </div>
    </div>
  )
}