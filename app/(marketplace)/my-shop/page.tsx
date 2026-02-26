'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingBag, Package, TrendingUp, Award, Eye,
  CheckCircle, XCircle, Plus, Trash2, BarChart3,
  Grid, List, Filter, Search, ArrowRight, Tag,
  Zap, Star, X,
} from 'lucide-react'

interface Product {
  id: string; name: string; price: number; quantity: number
  images: string[]; category: string; isActive: boolean
  viewCount: number; createdAt: string
  _count: { orders: number }
}

export default function MyShopPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'outofstock'>('all')
  const [restockingId, setRestockingId] = useState<string | null>(null)
  const [restockAmount, setRestockAmount] = useState<number>(1)
  const [userRole, setUserRole] = useState('')
  const [isSellerMode, setIsSellerMode] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    const loadUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
        const data = await response.json()
        if (response.ok && data.user) {
          setUserRole(data.user.role || 'BUYER')
          const sellerModePref = localStorage.getItem('sellerMode')
          if (sellerModePref !== null) setIsSellerMode(sellerModePref === 'true')
          else if (data.user.isSellerMode !== undefined) {
            setIsSellerMode(data.user.isSellerMode)
            localStorage.setItem('sellerMode', data.user.isSellerMode.toString())
          }
        }
      } catch (error) { console.error('Error fetching user:', error) }
    }

    loadUserData()
    fetchMyProducts()
  }, [])

  const fetchMyProducts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/products/my-products', { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await response.json()
      if (response.ok) setProducts(data.products || [])
      else alert(data.error || 'Failed to fetch products')
    } catch { alert('Network error') }
    finally { setLoading(false) }
  }

  const handleRestock = async (productId: string) => {
    if (restockAmount < 1) { alert('Please enter a valid quantity'); return }
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/products/${productId}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ quantity: restockAmount }),
      })
      const data = await response.json()
      if (response.ok) {
        alert(`✅ Restocked ${restockAmount} items!`)
        setRestockingId(null); setRestockAmount(1); fetchMyProducts()
      } else alert(data.error || 'Failed to restock')
    } catch { alert('Network error') }
  }

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Delete "${productName}"? This cannot be undone.`)) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) { alert('Product deleted'); fetchMyProducts() }
      else { const data = await response.json(); alert(data.error || 'Failed') }
    } catch { alert('Network error') }
  }

  const toggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (response.ok) fetchMyProducts()
      else { const data = await response.json(); alert(data.error || 'Failed') }
    } catch { alert('Network error') }
  }

  const toggleSellerMode = async () => {
    const newMode = !isSellerMode
    setIsSellerMode(newMode)
    localStorage.setItem('sellerMode', newMode.toString())
    if (userRole === 'SELLER' || userRole === 'ADMIN') {
      try {
        const token = localStorage.getItem('token')
        await fetch('/api/auth/toggle-seller-mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ isSellerMode: newMode }),
        })
      } catch { console.error('Error updating seller mode') }
    }
  }

  const filteredProducts = products.filter(p => {
    let matchesFilter = true
    if (filter === 'active') matchesFilter = p.quantity > 0 && p.isActive
    if (filter === 'outofstock') matchesFilter = p.quantity === 0
    const matchesSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price)

  const totalOrders = products.reduce((sum, p) => sum + (p._count?.orders || 0), 0)
  const activeCount = products.filter(p => p.quantity > 0 && p.isActive).length
  const outOfStockCount = products.filter(p => p.quantity === 0).length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-bata-primary border-t-transparent" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-24">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                {isSellerMode ? 'My Shop' : 'My Purchases'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isSellerMode ? 'Manage products and track performance' : 'Your purchase history'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Mode toggle */}
              {(userRole === 'SELLER' || userRole === 'ADMIN') && (
                <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200">
                  <button
                    onClick={() => !isSellerMode && toggleSellerMode()}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSellerMode ? 'bg-bata-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Seller
                  </button>
                  <button
                    onClick={() => isSellerMode && toggleSellerMode()}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      !isSellerMode ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" /> Buyer
                  </button>
                </div>
              )}

              {isSellerMode && (
                <Link
                  href="/sell"
                  className="flex items-center gap-2 bg-bata-primary hover:bg-bata-dark text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.97]"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {isSellerMode ? (
          <>
            {/* ── Stats cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { icon: <ShoppingBag className="w-5 h-5 text-bata-primary" />, bg: 'bg-bata-primary/8', value: products.length, label: 'Listed', sub: 'Total products' },
                { icon: <CheckCircle className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50', value: activeCount, label: 'Active', sub: 'In stock & live', color: 'text-emerald-600' },
                { icon: <XCircle className="w-5 h-5 text-red-500" />, bg: 'bg-red-50', value: outOfStockCount, label: 'Out of Stock', sub: 'Needs restocking', color: 'text-red-500' },
                { icon: <TrendingUp className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', value: totalOrders, label: 'Orders', sub: 'Total sales', color: 'text-blue-600' },
              ].map(({ icon, bg, value, label, sub, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>{icon}</div>
                  <p className={`text-2xl sm:text-3xl font-black ${color || 'text-gray-900'}`}>{value}</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Search + controls ────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
              {/* search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 focus:border-bata-primary focus:outline-none focus:ring-2 focus:ring-bata-primary/15 text-sm"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* filter tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {[
                  { key: 'all', label: `All (${products.length})`, activeClass: 'bg-bata-primary text-white' },
                  { key: 'active', label: `Active (${activeCount})`, activeClass: 'bg-emerald-500 text-white' },
                  { key: 'outofstock', label: `Out of Stock (${outOfStockCount})`, activeClass: 'bg-red-500 text-white' },
                ].map(({ key, label, activeClass }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      filter === key ? `${activeClass} shadow-md` : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* view toggle */}
              <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-xl ml-auto flex-shrink-0">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-bata-primary shadow-sm' : 'text-gray-500'}`}>
                  <Grid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-bata-primary shadow-sm' : 'text-gray-500'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Products ─────────────────────────────────────────────── */}
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-gray-100">
                  <Package className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-1">No products found</h3>
                <p className="text-sm text-gray-400 mb-6 text-center max-w-xs">
                  {searchTerm ? 'Try different keywords.' : 'List your first product to start selling!'}
                </p>
                <Link href="/sell" className="inline-flex items-center gap-2 bg-bata-primary hover:bg-bata-dark text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all">
                  <Plus className="w-4 h-4" /> List First Product
                </Link>
              </div>

            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    {/* image */}
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      <img
                        src={product.images[0] || '/placeholder.png'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 right-2.5">
                        {product.quantity === 0
                          ? <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-black rounded-lg shadow-md">OUT OF STOCK</span>
                          : <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-md">{product.quantity} LEFT</span>
                        }
                      </div>
                    </div>

                    <div className="p-4">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{product.category}</p>
                      <h3 className="font-black text-gray-900 text-base line-clamp-1 mb-1">{product.name}</h3>
                      <p className="text-bata-primary font-black text-lg mb-3">{formatPrice(product.price)}</p>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <p className="text-[11px] text-gray-400 font-semibold">Views</p>
                          <p className="text-sm font-black text-gray-900 flex items-center justify-center gap-1">
                            <Eye className="w-3 h-3" />{product.viewCount}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <p className="text-[11px] text-gray-400 font-semibold">Orders</p>
                          <p className="text-sm font-black text-gray-900 flex items-center justify-center gap-1">
                            <ShoppingBag className="w-3 h-3" />{product._count?.orders || 0}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/product/${product.id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-xs transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={() => toggleActive(product.id, product.isActive)}
                          className={`px-3 py-2 rounded-xl font-bold text-xs transition-all ${
                            product.isActive ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                        >
                          {product.isActive ? 'Pause' : 'Live'}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            ) : (
              /* List view */
              <div className="space-y-3">
                {filteredProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                    <div className="flex gap-0 sm:gap-5 p-0 sm:p-4">
                      {/* image */}
                      <div className="w-28 sm:w-36 flex-shrink-0 relative overflow-hidden rounded-none sm:rounded-xl bg-gray-100" style={{ minHeight: '120px' }}>
                        <img
                          src={product.images[0] || '/placeholder.png'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 absolute inset-0"
                        />
                        <div className="absolute top-2 left-2">
                          {product.quantity === 0
                            ? <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-md">OUT</span>
                            : product.quantity < 5
                            ? <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-md">LOW</span>
                            : null
                          }
                        </div>
                      </div>

                      {/* content */}
                      <div className="flex-1 min-w-0 p-3 sm:p-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{product.category}</p>
                              <h3 className="font-black text-gray-900 text-base sm:text-lg leading-tight mt-0.5 line-clamp-1">{product.name}</h3>
                            </div>
                            <p className="text-bata-primary font-black text-lg sm:text-xl whitespace-nowrap flex-shrink-0">{formatPrice(product.price)}</p>
                          </div>

                          {/* badges */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {product.quantity === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-red-50 text-red-700 rounded-full ring-1 ring-red-200">
                                <XCircle className="w-3 h-3" /> Out of Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full ring-1 ring-emerald-200">
                                <CheckCircle className="w-3 h-3" /> {product.quantity} in stock
                              </span>
                            )}
                            {!product.isActive && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-full ring-1 ring-gray-200">Inactive</span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded-full ring-1 ring-blue-200">
                              <Eye className="w-3 h-3" /> {product.viewCount} views
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-violet-50 text-violet-700 rounded-full ring-1 ring-violet-200">
                              <ShoppingBag className="w-3 h-3" /> {product._count?.orders || 0} orders
                            </span>
                          </div>
                        </div>

                        {/* actions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {/* restock */}
                          {(product.quantity === 0 || product.quantity < 5) && (
                            restockingId === product.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number" min="1" value={restockAmount}
                                  onChange={e => setRestockAmount(parseInt(e.target.value) || 1)}
                                  className="w-20 px-3 py-1.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-bata-primary text-sm font-bold bg-white"
                                />
                                <button onClick={() => handleRestock(product.id)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setRestockingId(null); setRestockAmount(1) }} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-sm transition-all">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setRestockingId(product.id)}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
                              >
                                <Package className="w-3.5 h-3.5" /> Restock
                              </button>
                            )
                          )}

                          <button
                            onClick={() => toggleActive(product.id, product.isActive)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                              product.isActive
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                            }`}
                          >
                            {product.isActive ? '⏸ Deactivate' : '▶ Activate'}
                          </button>

                          <Link
                            href={`/product/${product.id}`}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl font-bold text-xs transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Live
                          </Link>

                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold text-xs transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── Buyer mode ─────────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-blue-100">
                <ShoppingBag className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">You're in Buyer Mode</h2>
              <p className="text-gray-400 text-sm mb-7 max-w-sm mx-auto">Switch to Seller Mode to manage your products and listings.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/marketplace" className="inline-flex items-center gap-2 bg-bata-primary hover:bg-bata-dark text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all">
                  <ShoppingBag className="w-4 h-4" /> Browse Marketplace
                </Link>
                <Link href="/orders" className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-bold text-sm transition-all">
                  <Package className="w-4 h-4" /> View My Orders
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Order History</h2>
                  <p className="text-sm text-gray-400">Track deliveries and past purchases</p>
                </div>
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center ring-1 ring-gray-100">
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-gray-100">
                  <Award className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-black text-gray-700 mb-1">No orders yet</h3>
                <p className="text-sm text-gray-400 mb-5">Make purchases to see your order history here</p>
                <Link href="/orders" className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md">
                  View All Orders <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating add button */}
      {isSellerMode && (
        <Link
          href="/sell"
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 flex items-center gap-2 bg-bata-primary hover:bg-bata-dark text-white px-5 py-3.5 rounded-2xl font-black text-sm shadow-2xl shadow-bata-primary/30 hover:scale-105 transition-all z-50"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Product</span>
        </Link>
      )}
    </div>
  )
}