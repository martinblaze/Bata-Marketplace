'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'
import NotificationBell from '@/components/layout/NotificationBell'
import { ChevronDown, User, LogOut, Store, ShoppingBag, Wallet, Package, AlertTriangle, PlusCircle, Globe } from 'lucide-react'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [userBalance, setUserBalance] = useState(0)
  const [userRole, setUserRole] = useState('')
  const [isSellerMode, setIsSellerMode] = useState(true)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const cartCount = getTotalItems()

  // Scroll behavior - hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        // Scrolling down and past threshold
        setIsVisible(false)
      } else {
        // Scrolling up
        setIsVisible(true)
      }
      
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        setIsLoggedIn(true)
        const storedName = localStorage.getItem('userName')
        if (storedName) setUserName(storedName)
        
        const sellerModePref = localStorage.getItem('sellerMode')
        if (sellerModePref !== null) setIsSellerMode(sellerModePref === 'true')
        
        try {
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` },
          })
          const data = await response.json()
          if (response.ok && data.user) {
            setUserName(data.user.name)
            setUserBalance(data.user.availableBalance || 0)
            setUserRole(data.user.role || 'BUYER')
            localStorage.setItem('userName', data.user.name)
            if (data.user.isSellerMode !== undefined) {
              setIsSellerMode(data.user.isSellerMode)
              localStorage.setItem('sellerMode', data.user.isSellerMode.toString())
            }
          }
        } catch (error) {
          console.error('Error fetching user details:', error)
        }
      } else {
        setIsLoggedIn(false)
        setUserName('')
        setUserBalance(0)
        setUserRole('')
        setIsSellerMode(true)
      }
    }

    checkAuth()
    window.addEventListener('auth-change', checkAuth)
    return () => window.removeEventListener('auth-change', checkAuth)
  }, [pathname])

  const toggleRoleMode = async () => {
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
      } catch (error) {
        console.error('Error updating seller mode:', error)
      }
    }
    window.dispatchEvent(new Event('auth-change'))
  }

  const handleLogout = () => {
    localStorage.clear()
    setIsLoggedIn(false)
    setUserName('')
    setUserBalance(0)
    setUserRole('')
    setIsSellerMode(true)
    setIsUserDropdownOpen(false)
    router.push('/')
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-bata-primary to-bata-secondary rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h18v4H3V3zm0 6h18v12H3V9zm2 2v8h14v-8H5zm2 2h10v4H7v-4z"/>
              </svg>
            </div>
            <div>
              <span className="font-bold text-xl bg-gradient-to-r from-bata-primary to-bata-secondary bg-clip-text text-transparent">BATA</span>
              <p className="text-[10px] text-gray-500 -mt-1">Marketplace</p>
            </div>
          </Link>

          {/* Desktop Navigation - Only Cart and Notification Bell */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Cart */}
            {isLoggedIn && (
              <Link href="/cart" className="relative p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all">
                <ShoppingBag className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* Notification Bell */}
            {isLoggedIn && <NotificationBell />}

            {/* User Dropdown */}
            {isLoggedIn ? (
              <div className="relative ml-2" ref={dropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-700">Hi, {userName || 'User'}</span>
                    <span className="text-xs text-gray-500">
                      {userRole === 'ADMIN' ? 'Admin' : userRole === 'SELLER' ? (isSellerMode ? 'Selling' : 'Buying') : 'Buyer'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
                    {/* My Account */}
                    <Link
                      href="/myprofile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                    >
                      <User className="w-5 h-5 mr-3 text-gray-400" />
                      <span className="font-medium">My Account</span>
                    </Link>

                    {/* Marketplace */}
                    <Link
                      href="/marketplace"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={`flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors ${isActive('/marketplace') ? 'bg-blue-50 text-bata-primary' : ''}`}
                    >
                      <Globe className="w-5 h-5 mr-3 text-gray-400" />
                      <span>Marketplace</span>
                    </Link>

                    {/* My Shop */}
                    <Link
                      href="/my-shop"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={`flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors ${isActive('/my-shop') ? 'bg-orange-50 text-orange-600' : ''}`}
                    >
                      <Store className="w-5 h-5 mr-3 text-gray-400" />
                      <span>{isSellerMode && (userRole === 'SELLER' || userRole === 'ADMIN') ? 'My Shop' : 'My Items'}</span>
                    </Link>

                    {/* Sell */}
                    {isLoggedIn && (userRole === 'SELLER' || userRole === 'ADMIN') && isSellerMode && (
                      <Link
                        href="/sell"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className={`flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors ${isActive('/sell') ? 'bg-red-50 text-red-600' : ''}`}
                      >
                        <PlusCircle className="w-5 h-5 mr-3 text-gray-400" />
                        <span>Sell</span>
                      </Link>
                    )}

                    {/* Orders */}
                    <Link
                      href="/orders"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={`flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors ${isActive('/orders') ? 'bg-purple-50 text-purple-600' : ''}`}
                    >
                      <Package className="w-5 h-5 mr-3 text-gray-400" />
                      <span>Orders</span>
                    </Link>

                    {/* Wallet */}
                    <Link
                      href="/wallet"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={`flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors ${isActive('/wallet') ? 'bg-green-50 text-green-600' : ''}`}
                    >
                      <Wallet className="w-5 h-5 mr-3 text-gray-400" />
                      <div className="flex items-center justify-between flex-1">
                        <span>Wallet</span>
                        {userBalance > 0 && (
                          <span className="text-xs text-green-600 font-bold">₦{userBalance.toLocaleString()}</span>
                        )}
                      </div>
                    </Link>

                    {/* Disputes */}
                    {userRole !== 'RIDER' && (
                      <Link
                        href="/dispute/select-order"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className={`flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors ${isActive('/dispute') ? 'bg-red-50 text-red-600' : ''}`}
                      >
                        <AlertTriangle className="w-5 h-5 mr-3 text-gray-400" />
                        <span>Disputes</span>
                      </Link>
                    )}

                    {/* Rider Dashboard */}
                    {userRole === 'RIDER' && (
                      <Link
                        href="/rider-dashboard"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className={`flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors ${isActive('/rider-dashboard') ? 'bg-indigo-50 text-indigo-600' : ''}`}
                      >
                        <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Rider Dashboard</span>
                      </Link>
                    )}

                    {/* Role Toggle for Sellers/Admins */}
                    {(userRole === 'SELLER' || userRole === 'ADMIN') && (
                      <div className="px-4 py-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Mode</span>
                          <button
                            onClick={() => toggleRoleMode()}
                            className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors hover:bg-gray-400"
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSellerMode ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className="text-xs text-gray-500">{isSellerMode ? 'Selling' : 'Buying'}</span>
                        </div>
                      </div>
                    )}

                    {/* Become Seller for Buyers */}
                    {userRole === 'BUYER' && (
                      <Link
                        href="/become-seller"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center px-4 py-3 text-orange-600 hover:bg-orange-50 transition-colors border-t border-gray-100"
                      >
                        <PlusCircle className="w-5 h-5 mr-3" />
                        <span className="font-medium">Become a Seller</span>
                      </Link>
                    )}

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login" className="text-bata-primary hover:text-bata-dark font-semibold transition-colors">Login</Link>
                <Link href="/signup" className="bg-bata-primary hover:bg-bata-dark text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg text-sm">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4">
            {/* Mobile Header with Cart and Notifications */}
            <div className="flex items-center justify-end gap-4 mb-4 pb-4 border-b border-gray-200">
              {isLoggedIn && (
                <Link href="/cart" className="relative p-2 text-gray-600 hover:text-orange-600">
                  <ShoppingBag className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Link>
              )}
              {isLoggedIn && <NotificationBell />}
            </div>

            {isLoggedIn ? (
              <div className="space-y-2">
                {/* My Account */}
                <Link
                  href="/myprofile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center px-4 py-3 rounded-xl bg-gradient-to-r from-bata-primary to-bata-secondary text-white"
                >
                  <User className="w-5 h-5 mr-3" />
                  <span className="font-medium">My Account</span>
                </Link>

                {/* Marketplace */}
                <Link
                  href="/marketplace"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all ${isActive('/marketplace') ? 'bg-blue-50 text-bata-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Globe className="w-5 h-5 mr-3" />
                  <span>Marketplace</span>
                </Link>

                {/* My Shop */}
                <Link
                  href="/my-shop"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all ${isActive('/my-shop') ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Store className="w-5 h-5 mr-3" />
                  <span>{isSellerMode && (userRole === 'SELLER' || userRole === 'ADMIN') ? 'My Shop' : 'My Items'}</span>
                </Link>

                {/* Sell */}
                {isLoggedIn && (userRole === 'SELLER' || userRole === 'ADMIN') && isSellerMode && (
                  <Link
                    href="/sell"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-xl transition-all ${isActive('/sell') ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <PlusCircle className="w-5 h-5 mr-3" />
                    <span>Sell</span>
                  </Link>
                )}

                {/* Orders */}
                <Link
                  href="/orders"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all ${isActive('/orders') ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Package className="w-5 h-5 mr-3" />
                  <span>Orders</span>
                </Link>

                {/* Wallet */}
                <Link
                  href="/wallet"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all ${isActive('/wallet') ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Wallet className="w-5 h-5 mr-3" />
                  <div className="flex items-center justify-between flex-1">
                    <span>Wallet</span>
                    {userBalance > 0 && (
                      <span className="text-sm text-green-600 font-bold">₦{userBalance.toLocaleString()}</span>
                    )}
                  </div>
                </Link>

                {/* Disputes */}
                {userRole !== 'RIDER' && (
                  <Link
                    href="/dispute/select-order"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-xl transition-all ${isActive('/dispute') ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <AlertTriangle className="w-5 h-5 mr-3" />
                    <span>Disputes</span>
                  </Link>
                )}

                {/* Rider Dashboard */}
                {userRole === 'RIDER' && (
                  <Link
                    href="/rider-dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-xl transition-all ${isActive('/rider-dashboard') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Rider Dashboard</span>
                  </Link>
                )}

                {/* User Info & Logout */}
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-gray-700 font-medium">Hi, {userName || 'User'}!</div>
                      <div className="text-sm text-gray-500 capitalize">{userRole.toLowerCase()}</div>
                    </div>
                    {(userRole === 'SELLER' || userRole === 'ADMIN') && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{isSellerMode ? 'Selling' : 'Buying'}</span>
                        <button
                          onClick={() => { toggleRoleMode(); }}
                          className="relative inline-flex h-5 w-10 items-center rounded-full bg-gray-300"
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSellerMode ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="flex items-center justify-center w-full space-x-2 bg-red-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-red-700 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link href="/login" onClick={() => setIsMenuOpen(false)} className="text-center py-3 border-2 border-bata-primary text-bata-primary rounded-lg font-medium hover:bg-bata-primary hover:text-white transition-all">Login</Link>
                <Link href="/signup" onClick={() => setIsMenuOpen(false)} className="text-center py-3 bg-bata-primary text-white rounded-lg font-medium hover:bg-bata-dark transition-all">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}