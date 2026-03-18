'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Suspense, useState, useEffect } from 'react'

function NavbarContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isAndroid = searchParams.get('android') === 'true'
  const isAppParam = searchParams.get('app') === 'true'

  // Detect standalone PWA (same logic as Navbar.tsx)
  const [isStandalone, setIsStandalone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsStandalone(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isApp = isAppParam || isStandalone

  // Hide navbar completely on admin pages
  const hideNav =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/admin-login')

  if (hideNav) return null

  // Android WebView — Navbar returns null internally, no spacers needed
  if (isAndroid) return <Navbar />

  // App mode (PWA / standalone) — spacer for fixed top bar only
  // Bottom nav spacer is handled by page scroll area naturally
  if (isApp) {
    return (
      <>
        <Navbar />
        {/* Spacer to push content below the fixed top bar (h-14 = 56px) */}
        <div className="h-14" />
        {/* Spacer to push content above the fixed bottom nav (h-16 = 64px) */}
        <div className="h-16" />
      </>
    )
  }

  // Browser mode — spacer for fixed top navbar (h-16 = 64px)
  return (
    <>
      <Navbar />
      <div className="h-16" />
    </>
  )
}

export function NavbarWrapper() {
  return (
    <Suspense fallback={null}>
      <NavbarContent />
    </Suspense>
  )
}