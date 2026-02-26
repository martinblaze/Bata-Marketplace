'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'
import NotificationBell from '@/components/layout/NotificationBell'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [userBalance, setUserBalance] = useState(0)
  const [userRole, setUserRole] = useState('')
  const [isSellerMode, setIsSellerMode] = useState(true)
  
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const cartCount = getTotalItems()

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
    router.push('/')
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-12 h-12 bg-gradient-to-br from-bata-primary to-bata-secondary rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h18v4H3V3zm0 6h18v12H3V9zm2 2v8h14v-8H5zm2 2h10v4H7v-4z"/>
              </svg>
            </div>
            <div>
              <span className="font-bold text-2xl bg-gradient-to-r from-bata-primary to-bata-secondary bg-clip-text text-transparent">BATA</span>
              <p className="text-xs text-gray-500 -mt-1">Marketplace</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">

            {/* Marketplace */}
            <Link href="/marketplace" className={`flex flex-col items-center p-2 rounded-xl transition-all ${isActive('/marketplace') ? 'bg-blue-50 text-bata-primary shadow-sm' : 'text-gray-600 hover:text-bata-primary hover:bg-blue-50'}`}>
              <div className="w-10 h-10 flex items-center justify-center mb-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <span className="text-xs font-medium">Market</span>
            </Link>

            {/* Cart */}
            {isLoggedIn && (
              <Link href="/cart" className={`flex flex-col items-center p-2 rounded-xl transition-all ${isActive('/cart') ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'}`}>
                <div className="relative">
                  <div className="w-10 h-10 flex items-center justify-center mb-1">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">Cart</span>
              </Link>
            )}

            {/* Wallet */}
            {isLoggedIn && (
              <Link href="/wallet" className={`flex flex-col items-center p-2 rounded-xl transition-all ${isActive('/wallet') ? 'bg-green-50 text-green-600 shadow-sm' : 'text-gray-600 hover:text-green-600 hover:bg-green-50'}`}>
                <div className="relative">
                  <div className="w-10 h-10 flex items-center justify-center mb-1">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  {userBalance > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">₦</span>
                  )}
                </div>
                <span className="text-xs font-medium">Wallet</span>
                {userBalance > 0 && (
                  <span className="text-xs text-green-600 font-bold">₦{userBalance.toLocaleString()}</span>
                )}
              </Link>
            )}

            {/* Orders */}
            <Link href="/orders" className={`flex flex-col items-center p-2 rounded-xl transition-all ${isActive('/orders') ? 'bg-purple-50 text-purple-600 shadow-sm' : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'}`}>
              <div className="w-10 h-10 flex items-center justify-center mb-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-xs font-medium">Orders</span>
            </Link>

            {/* Disputes — visible to logged-in buyers/sellers */}
            {isLoggedIn && userRole !== 'RIDER' && (
              <Link href="/dispute/select-order" className={`flex flex-col items-center p-2 rounded-xl transition-all ${isActive('/dispute') ? 'bg-red-50 text-red-600 shadow-sm' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'}`}>
                <div className="w-10 h-10 flex items-center justify-center mb-1">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Disputes</span>
              </Link>
            )}

            {/* My Shop */}
            {isLoggedIn && (
              <Link href="/my-shop" className={`flex flex-col items-center p-2 rounded-xl transition-all ${isActive('/my-shop') ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'}`}>
                <div className="w-10 h-10 flex items-center justify-center mb-1">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-xs font-medium">
                  {isSellerMode && (userRole === 'SELLER' || userRole === 'ADMIN') ? 'My Shop' : 'My Items'}
                </span>
              </Link>
            )}

            {/* Sell */}
            {isLoggedIn && (userRole === 'SELLER' || userRole === 'ADMIN') && isSellerMode && (
              <Link href="/sell" className={`flex flex-col items-center p-2 rounded-xl transition-all ${isActive('/sell') ? 'bg-red-50 text-red-600 shadow-sm' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'}`}>
                <div className="w-10 h-10 flex items-center justify-center mb-1">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Sell</span>
              </Link>
            )}

            {/* Rider Dashboard */}
            {isLoggedIn && userRole === 'RIDER' && (
              <Link href="/rider-dashboard" className={`flex flex-col items-center p-2 rounded-xl transition-all ${isActive('/rider-dashboard') ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                <div className="w-10 h-10 flex items-center justify-center mb-1">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Rider</span>
              </Link>
            )}

            {/* Notification Bell & User Profile */}
            <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
              {isLoggedIn && <NotificationBell />}
              {isLoggedIn ? (
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-700">Hi, {userName || 'User'}!</span>
                    <div className="flex items-center space-x-2">
                      {userRole === 'SELLER' || userRole === 'ADMIN' ? (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 capitalize mr-2">
                            {userRole === 'ADMIN' ? 'Admin' : 'Seller'}
                          </span>
                          <button onClick={() => toggleRoleMode()} className="relative inline-flex h-5 w-10 items-center rounded-full bg-gray-300 transition-colors hover:bg-gray-400">
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSellerMode ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                          <span className="text-xs text-gray-500 ml-2">{isSellerMode ? 'Selling' : 'Buying'}</span>
                        </div>
                      ) : userRole === 'BUYER' ? (
                        <Link href="/become-seller" className="text-xs text-orange-600 hover:text-orange-700 font-medium hover:underline flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Become a Seller
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-500 capitalize">{userRole.toLowerCase()}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={handleLogout} className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-bata-primary hover:text-bata-dark font-semibold transition-colors">Login</Link>
                  <Link href="/signup" className="bg-bata-primary hover:bg-bata-dark text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg">Sign Up</Link>
                </>
              )}
            </div>
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
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4">
            <div className="flex items-center justify-end gap-3 mb-4 pb-4 border-b border-gray-200">
              {isLoggedIn && <NotificationBell />}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Marketplace Mobile */}
              <Link href="/marketplace" onClick={() => setIsMenuOpen(false)} className={`flex flex-col items-center p-3 rounded-xl transition-all ${isActive('/marketplace') ? 'bg-blue-50 text-bata-primary' : 'text-gray-600 hover:text-bata-primary hover:bg-blue-50'}`}>
                <div className="w-12 h-12 flex items-center justify-center mb-2">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Market</span>
              </Link>

              {/* Cart Mobile */}
              {isLoggedIn && (
                <Link href="/cart" onClick={() => setIsMenuOpen(false)} className={`flex flex-col items-center p-3 rounded-xl transition-all ${isActive('/cart') ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'}`}>
                  <div className="relative">
                    <div className="w-12 h-12 flex items-center justify-center mb-2">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    {cartCount > 0 && (
                      <span className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">Cart</span>
                </Link>
              )}

              {/* Wallet Mobile */}
              {isLoggedIn && (
                <Link href="/wallet" onClick={() => setIsMenuOpen(false)} className={`flex flex-col items-center p-3 rounded-xl transition-all ${isActive('/wallet') ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:text-green-600 hover:bg-green-50'}`}>
                  <div className="relative">
                    <div className="w-12 h-12 flex items-center justify-center mb-2">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    {userBalance > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">₦</span>
                    )}
                  </div>
                  <span className="text-xs font-medium">Wallet</span>
                  {userBalance > 0 && (
                    <span className="text-xs text-green-600 font-bold">₦{userBalance.toLocaleString()}</span>
                  )}
                </Link>
              )}

              {/* Orders Mobile */}
              <Link href="/orders" onClick={() => setIsMenuOpen(false)} className={`flex flex-col items-center p-3 rounded-xl transition-all ${isActive('/orders') ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'}`}>
                <div className="w-12 h-12 flex items-center justify-center mb-2">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Orders</span>
              </Link>

              {/* Disputes Mobile */}
              {isLoggedIn && userRole !== 'RIDER' && (
                <Link href="/dispute/select-order" onClick={() => setIsMenuOpen(false)} className={`flex flex-col items-center p-3 rounded-xl transition-all ${isActive('/dispute') ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'}`}>
                  <div className="w-12 h-12 flex items-center justify-center mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Disputes</span>
                </Link>
              )}

              {/* My Shop Mobile */}
              {isLoggedIn && (
                <Link href="/my-shop" onClick={() => setIsMenuOpen(false)} className={`flex flex-col items-center p-3 rounded-xl transition-all ${isActive('/my-shop') ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'}`}>
                  <div className="w-12 h-12 flex items-center justify-center mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">
                    {isSellerMode && (userRole === 'SELLER' || userRole === 'ADMIN') ? 'My Shop' : 'My Items'}
                  </span>
                </Link>
              )}

              {/* Sell Mobile */}
              {isLoggedIn && (userRole === 'SELLER' || userRole === 'ADMIN') && isSellerMode && (
                <Link href="/sell" onClick={() => setIsMenuOpen(false)} className={`flex flex-col items-center p-3 rounded-xl transition-all ${isActive('/sell') ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'}`}>
                  <div className="w-12 h-12 flex items-center justify-center mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Sell</span>
                </Link>
              )}

              {/* Rider Dashboard Mobile */}
              {isLoggedIn && userRole === 'RIDER' && (
                <Link href="/rider-dashboard" onClick={() => setIsMenuOpen(false)} className={`flex flex-col items-center p-3 rounded-xl transition-all ${isActive('/rider-dashboard') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                  <div className="w-12 h-12 flex items-center justify-center mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Rider</span>
                </Link>
              )}
            </div>

            {/* Auth Section Mobile */}
            <div className="pt-4 border-t border-gray-200">
              {isLoggedIn ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-gray-700 font-medium">Hi, {userName || 'User'}!</div>
                      <div className="flex items-center space-x-2 mt-1">
                        {userRole === 'SELLER' || userRole === 'ADMIN' ? (
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 capitalize mr-2">
                              {userRole === 'ADMIN' ? 'Admin' : 'Seller'}
                            </span>
                            <button onClick={() => { toggleRoleMode(); setIsMenuOpen(false) }} className="relative inline-flex h-5 w-10 items-center rounded-full bg-gray-300 transition-colors hover:bg-gray-400">
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSellerMode ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                            <span className="text-xs text-gray-500 ml-2">{isSellerMode ? 'Selling' : 'Buying'}</span>
                          </div>
                        ) : userRole === 'BUYER' ? (
                          <Link href="/become-seller" onClick={() => setIsMenuOpen(false)} className="text-xs text-orange-600 hover:text-orange-700 font-medium hover:underline flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Become a Seller
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-500 capitalize">{userRole.toLowerCase()}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { handleLogout(); setIsMenuOpen(false) }} className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
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
        </div>
      )}
    </nav>
  )
}