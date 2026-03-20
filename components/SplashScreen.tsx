'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

function unblockPage() {
  document.documentElement.classList.remove('splash-pending')
}

// ─── Global signal: is splash currently showing? ───────────────────────────
// Stored in sessionStorage so marketplace page can read it synchronously
// on first render before React effects run.
export function isSplashPending(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    const isAppParam = window.location.search.indexOf('app=true') !== -1
    const isAndroid = window.location.search.indexOf('android=true') !== -1
    const splashShown = sessionStorage.getItem('batamart_splash_app')
    const splashBrowserShown = sessionStorage.getItem('batamart_splash_browser')

    if (isAndroid) return false

    // App mode splash
    if ((isStandalone || isAppParam) && !splashShown) return true

    // Browser mode splash (only on /marketplace)
    if (!isStandalone && !isAppParam && !splashBrowserShown &&
        window.location.pathname === '/marketplace') return true

    return false
  } catch {
    return false
  }
}

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle')

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    const isAppParam = searchParams.get('app') === 'true'
    const isAndroid  = searchParams.get('android') === 'true'
    const isAppMode  = isStandalone || isAppParam

    if (isAndroid) {
      unblockPage()
      return
    }

    const shouldShowAppSplash =
      isAppMode && !sessionStorage.getItem('batamart_splash_app')

    const shouldShowBrowserSplash =
      !isAppMode &&
      pathname === '/marketplace' &&
      !sessionStorage.getItem('batamart_splash_browser')

    if (!shouldShowAppSplash && !shouldShowBrowserSplash) {
      unblockPage()
      return
    }

    if (shouldShowAppSplash)     sessionStorage.setItem('batamart_splash_app', '1')
    if (shouldShowBrowserSplash) sessionStorage.setItem('batamart_splash_browser', '1')

    preloadImage('/BATAMART - logo.png').then(() => {
      setVisible(true)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('in'))
      })

      const outTimer = setTimeout(() => setPhase('out'), 2500)

      const doneTimer = setTimeout(() => {
        setVisible(false)
        unblockPage()
        // Dispatch event so marketplace page knows splash is done
        window.dispatchEvent(new CustomEvent('batamart:splash-done'))
        if (isAppMode && pathname === '/') {
          router.replace('/marketplace?app=true')
        }
      }, 3000)

      return () => {
        clearTimeout(outTimer)
        clearTimeout(doneTimer)
      }
    })
  }, [pathname, searchParams, router])

  if (!visible) return null

  const logoStyle: React.CSSProperties = {
    opacity:   phase === 'in' ? 1 : 0,
    transform: phase === 'out' ? 'translateY(-8px)' : 'translateY(0)',
    transition:
      phase === 'in'
        ? 'opacity 700ms cubic-bezier(0.45,0,0.55,1) 200ms'
        : phase === 'out'
        ? 'opacity 400ms ease, transform 400ms ease'
        : 'none',
  }

  const textStyle: React.CSSProperties = {
    opacity:   phase === 'in' ? 1 : 0,
    transform:
      phase === 'in'   ? 'translateY(0)'
      : phase === 'out' ? 'translateY(-20px)'
      :                   'translateY(30px)',
    transition:
      phase === 'in'
        ? 'opacity 700ms cubic-bezier(0.45,0,0.55,1) 600ms, transform 700ms cubic-bezier(0.45,0,0.55,1) 600ms'
        : phase === 'out'
        ? 'opacity 400ms ease, transform 400ms ease'
        : 'none',
  }

  return (
    <div
      id="__splash_screen"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
    >
      <img
        src="/BATAMART - logo.png"
        alt="BataMart"
        style={{
          width: '280px',
          height: '120px',
          objectFit: 'contain',
          ...logoStyle,
        }}
      />
      <p
        style={{
          marginTop: '12px',
          color: '#1a3f8f',
          fontSize: '16px',
          fontWeight: 600,
          ...textStyle,
        }}
      >
        Campus Marketplace
      </p>
    </div>
  )
}