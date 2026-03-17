'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

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

    // ── Android WebView already has its own native Java splash ────────────────
    // Never show the web splash inside the Android app — it would play twice.
    if (isAndroid) return

    const run = () => {
      setVisible(true)
      // tiny double-rAF so the element is mounted before CSS transitions fire
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('in'))
      })

      // At 2500ms → start fade-out
      const outTimer = setTimeout(() => setPhase('out'), 2500)

      // At 3000ms → unmount + redirect if needed
      const doneTimer = setTimeout(() => {
        setVisible(false)
        if (isAppMode && pathname === '/') {
          router.replace('/marketplace?app=true')
        }
      }, 3000)

      return () => {
        clearTimeout(outTimer)
        clearTimeout(doneTimer)
      }
    }

    // ── PWA / app mode ────────────────────────────────────────────────────────
    // Show once per session then never again until browser is closed.
    if (isAppMode) {
      if (sessionStorage.getItem('batamart_splash_app')) return
      sessionStorage.setItem('batamart_splash_app', '1')
      return run()
    }

    // ── Browser mode ──────────────────────────────────────────────────────────
    // Only show the first time user hits /marketplace this session.
    // Never on landing page or any other page.
    if (pathname === '/marketplace') {
      if (sessionStorage.getItem('batamart_splash_browser')) return
      sessionStorage.setItem('batamart_splash_browser', '1')
      return run()
    }

    // All other pages → do nothing
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
      phase === 'in'  ? 'translateY(0)'
      : phase === 'out' ? 'translateY(-20px)'
      :                   'translateY(30px)', // starts pushed down like Android's 30dp
    transition:
      phase === 'in'
        ? 'opacity 700ms cubic-bezier(0.45,0,0.55,1) 600ms, transform 700ms cubic-bezier(0.45,0,0.55,1) 600ms'
        : phase === 'out'
        ? 'opacity 400ms ease, transform 400ms ease'
        : 'none',
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      {/* Logo — 280×120 equivalent of Android's fitCenter */}
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

      {/* Text — slides up from 30px below, fades in */}
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