'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Suspense } from 'react'

function NavbarContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isApp = searchParams.get('app') === 'true'

  const hideNav = pathname?.startsWith('/admin') ||
    pathname?.startsWith('/admin-login') ||
    pathname === '/'

  if (hideNav) return null

  return (
    <>
      <Navbar />
      <div className={isApp ? 'pt-14' : 'pt-16'} />
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