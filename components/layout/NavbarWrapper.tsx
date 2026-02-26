'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'

export function NavbarWrapper() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin') || pathname === '/') return null
  return <Navbar />
}