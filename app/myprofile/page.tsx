// app/myprofile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, ShoppingBag, Store, PlusCircle, Wallet, Package, 
  AlertTriangle, LogOut, ChevronRight, MapPin, Phone, 
  Home, Mail, Edit2, Check, X, Loader2, Menu, ChevronLeft
} from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  hostelName: string
  roomNumber: string
  landmark: string
  role: string
  isSellerMode: boolean
}

interface WalletData {
  availableBalance: number
}

export default function MyProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<Partial<UserProfile>>({})
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetchProfileData()
  }, [])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const [userRes, walletRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } })
      ])

      const userData = await userRes.json()
      const walletData = await walletRes.json()

      if (userRes.ok) {
        setUser(userData.user)
        setEditedUser(userData.user)
      }
      if (walletRes.ok) setWallet(walletData.wallet)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editedUser.name,
          phone: editedUser.phone,
          hostelName: editedUser.hostelName,
          roomNumber: editedUser.roomNumber,
          landmark: editedUser.landmark
        })
      })

      const data = await response.json()

      if (response.ok) {
        setUser({ ...user!, ...editedUser })
        setIsEditing(false)
        setSaveSuccess(true)
        if (editedUser.name) localStorage.setItem('userName', editedUser.name)
        window.dispatchEvent(new Event('auth-change'))
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        setSaveError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      setSaveError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedUser(user || {})
    setIsEditing(false)
    setSaveError('')
  }

  const handleLogout = () => {
    localStorage.clear()
    window.dispatchEvent(new Event('auth-change'))
    router.push('/')
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-bata-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  const isSeller = user.role === 'SELLER' || user.role === 'ADMIN'

  const menuItems = [
    { icon: <ShoppingBag className="w-5 h-5" />, label: 'Marketplace', href: '/marketplace' },
    { icon: <Store className="w-5 h-5" />, label: isSeller && user.isSellerMode ? 'My Shop' : 'My Items', href: '/my-shop' },
    ...(isSeller && user.isSellerMode ? [{ icon: <PlusCircle className="w-5 h-5" />, label: 'Sell', href: '/sell' }] : []),
    { icon: <Package className="w-5 h-5" />, label: 'Orders', href: '/orders' },
    { icon: <Wallet className="w-5 h-5" />, label: 'Wallet', href: '/wallet' },
    ...(user.role !== 'RIDER' ? [{ icon: <AlertTriangle className="w-5 h-5" />, label: 'Disputes', href: '/dispute/select-order' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900">My Account</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Slide-out Panel */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 lg:hidden shadow-2xl transform transition-transform duration-300 ease-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-bata-primary rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">My BATA Account</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto py-2">
                {menuItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-gray-300" />
                  </Link>
                ))}
              </nav>

              {/* Logout */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-orange-600 hover:bg-orange-50 rounded-xl font-medium transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Breadcrumb - Hidden on mobile */}
      <div className="hidden lg:block bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/marketplace" className="hover:text-bata-primary transition">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">My Account</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-20">
              <div className="px-4 py-4 bg-gray-100 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-bata-primary rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">My BATA Account</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
                  </div>
                </div>
              </div>

              <nav className="divide-y divide-gray-100">
                {menuItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-bata-primary transition-colors"
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="border-t border-gray-200 p-4">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium text-sm w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4 lg:space-y-6">
            
            {/* Account Overview Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Account Overview</h1>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-bata-primary hover:text-bata-dark font-medium text-sm px-3 lg:px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit Profile</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium text-sm px-3 lg:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-bata-primary hover:bg-bata-dark text-white font-medium text-sm px-3 lg:px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
                    <span className="sm:hidden">Save</span>
                  </button>
                </div>
              )}
            </div>

            {/* Success/Error Messages */}
            {saveSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">Profile updated successfully!</span>
              </div>
            )}
            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">{saveError}</span>
              </div>
            )}

            {/* Account Details & Address Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              
              {/* Account Details */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 text-sm lg:text-base">ACCOUNT DETAILS</h2>
                  {isEditing && <span className="text-xs text-bata-primary font-medium">Editing...</span>}
                </div>
                <div className="p-4 lg:p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedUser.name || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bata-primary focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{user.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900 font-medium text-sm break-all">{user.email}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">
                          +234
                        </span>
                        <input
                          type="tel"
                          value={(editedUser.phone || '').replace(/^\+?234/, '')}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '')
                            setEditedUser({ ...editedUser, phone: digits })
                          }}
                          maxLength={11}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-bata-primary focus:border-transparent"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 font-medium">+234 {user.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Book */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 text-sm lg:text-base">ADDRESS BOOK</h2>
                  {isEditing && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="text-bata-primary hover:text-bata-dark text-sm font-medium"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </div>
                <div className="p-4 lg:p-5 space-y-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Your default shipping address:
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Hostel/Location
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedUser.hostelName || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, hostelName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bata-primary focus:border-transparent"
                        placeholder="e.g. Boys Hostel, Block A"
                      />
                    ) : (
                      <div className="flex items-start gap-2">
                        <Home className="w-4 h-4 text-gray-400 mt-0.5" />
                        <p className="text-gray-900 font-medium">{user.hostelName || 'Not set'}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Room Number
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedUser.roomNumber || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, roomNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bata-primary focus:border-transparent"
                        placeholder="e.g. 205"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{user.roomNumber || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Landmark
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedUser.landmark || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, landmark: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bata-primary focus:border-transparent"
                        placeholder="e.g. Near the cafeteria"
                      />
                    ) : (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <p className="text-gray-900 font-medium">{user.landmark || 'Not set'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BATA Balance Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-sm lg:text-base">BATA BALANCE</h2>
              </div>
              <div className="p-4 lg:p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-bata-primary to-bata-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Available Balance</p>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                      ₦{wallet?.availableBalance?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                  <Link
                    href="/wallet"
                    className="ml-auto text-bata-primary hover:text-bata-dark font-medium text-sm flex items-center gap-1 flex-shrink-0"
                  >
                    View <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Recommended For You Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-sm lg:text-base">Recommended For You</h2>
                <Link href="/marketplace" className="text-bata-primary hover:text-bata-dark text-sm font-medium flex items-center gap-1">
                  See All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="p-4 lg:p-5">
                <RecommendedProducts />
              </div>
            </div>

            {/* Search History Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-sm lg:text-base">Your Search History</h2>
                <button 
                  onClick={() => {
                    localStorage.removeItem('bata-recent-searches')
                    window.location.reload()
                  }}
                  className="text-gray-500 hover:text-red-600 text-sm font-medium"
                >
                  Clear
                </button>
              </div>
              <div className="p-4 lg:p-5">
                <SearchHistory />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// Component for recommended products
function RecommendedProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchRecommended()
  }, [])

  const fetchRecommended = async () => {
    try {
      const recentlyViewed = JSON.parse(localStorage.getItem('bata-recently-viewed') || '[]')
      const interests = JSON.parse(localStorage.getItem('bata-interests') || '[]')
      
      const res = await fetch('/api/products?limit=6')
      const data = await res.json()
      
      if (data.products) {
        const sorted = data.products.sort((a: any, b: any) => {
          const aMatch = interests.includes(a.category) ? 1 : 0
          const bMatch = interests.includes(b.category) ? 1 : 0
          return bMatch - aMatch
        })
        setProducts(sorted.slice(0, 6))
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (p: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-lg mb-2" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Start browsing to get personalized recommendations!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={() => router.push(`/product/${product.id}`)}
          className="cursor-pointer group"
        >
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
            <img
              src={product.images?.[0] || '/placeholder.png'}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
          <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.name}</p>
          <p className="text-sm font-bold text-bata-primary">{fmt(product.price)}</p>
          {product.originalPrice && product.originalPrice > product.price && (
            <p className="text-xs text-gray-400 line-through">{fmt(product.originalPrice)}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// Component for search history
function SearchHistory() {
  const [searches, setSearches] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('bata-recent-searches') || '[]')
    setSearches(recent.slice(0, 10))
  }, [])

  if (searches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No search history yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {searches.map((search, index) => (
        <button
          key={index}
          onClick={() => router.push(`/search?q=${encodeURIComponent(search)}`)}
          className="px-4 py-2 bg-gray-100 hover:bg-bata-primary hover:text-white text-gray-700 rounded-full text-sm font-medium transition-colors"
        >
          {search}
        </button>
      ))}
    </div>
  )
}