// app/dispute/select-order/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  AlertTriangle, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Search, 
  Shield, 
  Filter,
  Truck,
  ShoppingBag,
  AlertCircle
} from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  totalAmount: number
  product: {
    name: string
    images: string[]
    price: number
  }
  seller: {
    name: string
    rating: number
    trustLevel: string
  }
  status: string
  createdAt: string
  deliveredAt?: string
  pickedUpAt?: string
  completedAt?: string
  canDispute: boolean
  disputeReason?: string
  hasExistingDispute: boolean
  existingDisputeStatus?: string
  debug?: any
}

export default function SelectOrderForDisputePage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'DELIVERED' | 'IN_TRANSIT' | 'PROCESSING' | 'OTHER'>('ALL')
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      console.log('🔍 Fetching orders from API...')
      const response = await fetch('/api/orders/my-orders', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders')
      }

      console.log('✅ Orders fetched successfully:', {
        total: data.orders.length,
        eligible: data.stats?.eligibleForDispute,
        statusBreakdown: data.stats?.byStatus
      })
      
      setOrders(data.orders)
      
    } catch (err: any) {
      console.error('❌ Failed to fetch orders:', err)
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders
    .filter(order => {
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'DELIVERED' && !['DELIVERED', 'COMPLETED'].includes(order.status)) return false
        if (selectedStatus === 'IN_TRANSIT' && !['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(order.status)) return false
        if (selectedStatus === 'PROCESSING' && !['PROCESSING', 'SHIPPED'].includes(order.status)) return false
        if (selectedStatus === 'OTHER') {
          const shownStatuses = ['DELIVERED', 'COMPLETED', 'RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'PROCESSING', 'SHIPPED']
          if (shownStatuses.includes(order.status)) return false
        }
      }
      
      if (!searchQuery) return true
      
      const query = searchQuery.toLowerCase()
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.product.name.toLowerCase().includes(query) ||
        order.seller.name.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'DISPUTED':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'RIDER_ASSIGNED':
      case 'PICKED_UP':
      case 'ON_THE_WAY':
        return <Truck className="w-4 h-4 text-blue-500" />
      case 'PROCESSING':
      case 'SHIPPED':
        return <ShoppingBag className="w-4 h-4 text-purple-500" />
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'DISPUTED':
        return 'bg-orange-100 text-orange-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'RIDER_ASSIGNED':
      case 'PICKED_UP':
      case 'ON_THE_WAY':
        return 'bg-blue-100 text-blue-800'
      case 'PROCESSING':
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ')
  }

  const getStatusCategory = (status: string) => {
    if (['DELIVERED', 'COMPLETED'].includes(status)) return 'DELIVERED'
    if (['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(status)) return 'IN_TRANSIT'
    if (['PROCESSING', 'SHIPPED'].includes(status)) return 'PROCESSING'
    return 'OTHER'
  }

  const refreshOrders = () => {
    fetchOrders()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Select Order to Dispute</h1>
              <p className="text-gray-600">
                Choose an order you'd like to file a dispute for. You can dispute orders within 7 days of delivery.
              </p>
            </div>
          </div>
          
          {/* Debug Toggle */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
              >
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </button>
              <button
                onClick={refreshOrders}
                className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium"
              >
                Refresh Orders
              </button>
              <span className="text-xs text-gray-500">
                Check browser console for detailed logs
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">{error}</p>
                <button
                  onClick={refreshOrders}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Banner */}
        {!loading && orders.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">{orders.length}</div>
                <div className="text-sm text-blue-600">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {orders.filter(o => o.canDispute).length}
                </div>
                <div className="text-sm text-green-600">Eligible for Dispute</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-700">
                  {orders.filter(o => o.hasExistingDispute).length}
                </div>
                <div className="text-sm text-orange-600">Already Disputed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-700">
                  {orders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status)).length}
                </div>
                <div className="text-sm text-purple-600">Delivered</div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order number, product name, or seller..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
              >
                <option value="ALL">All Orders</option>
                <option value="DELIVERED">Delivered/Completed</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="PROCESSING">Processing/Shipped</option>
                <option value="OTHER">Other Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <h3 className="font-bold text-orange-900">What can you dispute?</h3>
            </div>
            <ul className="space-y-2 text-sm text-orange-800">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5"></div>
                <span>Wrong or damaged items received</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5"></div>
                <span>Items not delivered</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5"></div>
                <span>Fake or counterfeit products</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5"></div>
                <span>Significantly different from description</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <h3 className="font-bold text-blue-900">Time Limit</h3>
            </div>
            <p className="text-sm text-blue-800 mb-3">
              You can dispute delivered orders within 7 days of delivery.
              For other statuses, you can dispute at any time.
            </p>
            <div className="text-xs text-blue-700 bg-blue-100 px-3 py-2 rounded-lg">
              <strong>Note:</strong> Disputes are reviewed within 3-5 business days
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="font-bold text-green-900">Before Disputing</h3>
            </div>
            <ul className="space-y-2 text-sm text-green-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Try contacting the seller first</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Gather evidence (photos, messages)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Be specific about the issue</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Loading your orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">
                {searchQuery || selectedStatus !== 'ALL' 
                  ? 'No orders match your search'
                  : 'No orders found'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchQuery || selectedStatus !== 'ALL' 
                  ? 'Try different search terms or clear filters.'
                  : "You haven't placed any orders yet. Start shopping to see orders here!"}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="inline-block bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  Browse Products
                </Link>
                <button
                  onClick={refreshOrders}
                  className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  Refresh Orders
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Debug information banner */}
              {showDebug && (
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <strong className="text-gray-800">Debug Info:</strong>
                      <span className="text-gray-600 ml-2">
                        Showing {filteredOrders.length} of {orders.length} orders
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        console.log('=== ALL ORDERS ===', orders)
                        console.log('=== FILTERED ORDERS ===', filteredOrders)
                        alert('Check browser console for order details')
                      }}
                      className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      Log to Console
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-green-50 p-2 rounded">
                      <div className="font-medium text-green-800">Eligible: {filteredOrders.filter(o => o.canDispute).length}</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded">
                      <div className="font-medium text-red-800">Not Eligible: {filteredOrders.filter(o => !o.canDispute).length}</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="font-medium text-blue-800">Delivered: {filteredOrders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status)).length}</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="font-medium text-purple-800">Disputed: {filteredOrders.filter(o => o.hasExistingDispute).length}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Orders List */}
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className={`p-6 hover:bg-gray-50 transition-colors duration-200 ${order.canDispute ? 'cursor-pointer hover:shadow-sm' : 'cursor-not-allowed'}`}
                  onClick={() => {
                    if (order.canDispute) {
                      console.log('Opening dispute for order:', order)
                      router.push(`/orders/${order.id}/dispute`)
                    }
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 overflow-hidden">
                        <img
                          src={order.product.images[0] || '/placeholder.png'}
                          alt={order.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-bold text-gray-900">Order #{order.orderNumber}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(order.status)}
                              {getStatusText(order.status)}
                            </span>
                          </span>
                          {order.hasExistingDispute && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                              ⚖️ Already Disputed
                            </span>
                          )}
                          {order.canDispute && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              ✓ Can Dispute
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1">{order.product.name}</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Seller: {order.seller.name} ({order.seller.trustLevel})</p>
                          <p>Ordered: {formatDate(order.createdAt)}</p>
                          {order.deliveredAt && <p>Delivered: {formatDate(order.deliveredAt)}</p>}
                          {order.pickedUpAt && <p>Picked up: {formatDate(order.pickedUpAt)}</p>}
                          {order.completedAt && <p>Completed: {formatDate(order.completedAt)}</p>}
                        </div>
                        
                        {/* Show dispute reason */}
                        {!order.canDispute && order.disputeReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{order.disputeReason}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Show debug info */}
                        {showDebug && order.debug && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                            <details>
                              <summary className="cursor-pointer font-medium">Debug Details</summary>
                              <pre className="mt-1 whitespace-pre-wrap">
                                {JSON.stringify(order.debug, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-xl font-bold text-orange-600">{formatPrice(order.totalAmount)}</p>
                        <p className="text-sm text-gray-500">Product: {formatPrice(order.product.price)}</p>
                      </div>
                      
                      {order.canDispute ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 font-semibold">
                          <span>Click to Open Dispute</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 max-w-[200px]">
                          <div className="flex items-start gap-1">
                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span>{order.disputeReason || 'Not eligible for dispute'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {order.canDispute && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          console.log('Opening dispute for order:', order)
                          router.push(`/orders/${order.id}/dispute`)
                        }}
                        className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Open Dispute for This Order
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats and Back Link */}
        <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Marketplace
            </Link>
          </div>
          {!loading && orders.length > 0 && (
            <div className="text-sm text-gray-500">
              Showing {filteredOrders.length} of {orders.length} orders
              {filteredOrders.length < orders.length && ' (filtered)'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}