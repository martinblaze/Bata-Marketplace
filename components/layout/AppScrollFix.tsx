'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function AppScrollFixInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const isAppParam = searchParams.get('app') === 'true'
  const isAndroid = searchParams.get('android') === 'true'

  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsStandalone(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isApp = isAppParam || isStandalone || isAndroid

  return (
    <div id="page-scroll-container" className={isApp ? 'pb-nav' : ''}>
      {children}
    </div>
  )
}

export function AppScrollFix({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div id="page-scroll-container">{children}</div>}>
      <AppScrollFixInner>{children}</AppScrollFixInner>
    </Suspense>
  )
}