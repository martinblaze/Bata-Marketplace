'use client'

import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// RiderInstallPrompt
// Shown on /rider-dashboard to riders who haven't installed the rider PWA yet.
// Injects the rider-specific manifest so when they add to home screen, the
// start_url is /rider-dashboard?app=true&rider=true (not /marketplace).
// ─────────────────────────────────────────────────────────────────────────────
export default function RiderInstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIos, setIsIos] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Don't show if already in standalone (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Don't show if already dismissed
    if (localStorage.getItem('riderInstallDismissed')) return

    // ── Swap the manifest to the rider-specific one ──────────────────────────
    // This makes "Add to Home Screen" use rider start_url instead of /marketplace
    const existingManifest = document.querySelector('link[rel="manifest"]')
    if (existingManifest) {
      existingManifest.setAttribute('href', '/manifest-rider.json')
    } else {
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = '/manifest-rider.json'
      document.head.appendChild(link)
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIos(ios)

    if (ios) {
      // iOS — show manual guide after delay
      setTimeout(() => setShow(true), 3000)
    } else {
      // Android — listen for beforeinstallprompt
      const handler = (e: any) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setTimeout(() => setShow(true), 3000)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        // Restore original manifest when leaving rider dashboard
        const manifestLink = document.querySelector('link[rel="manifest"]')
        if (manifestLink) manifestLink.setAttribute('href', '/manifest.json')
      }
    }

    return () => {
      // Restore original manifest when unmounting
      const manifestLink = document.querySelector('link[rel="manifest"]')
      if (manifestLink) manifestLink.setAttribute('href', '/manifest.json')
    }
  }, [])

  const installAndroid = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setInstalling(false)
    if (outcome === 'accepted') {
      setShow(false)
      localStorage.setItem('riderInstallDismissed', 'true')
    }
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('riderInstallDismissed', 'true')
  }

  if (!show) return null

  return (
    <>
      <style>{`
        @keyframes riderSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .rider-install-prompt {
          animation: riderSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      {/* iOS — full bottom sheet with steps */}
      {isIos ? (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
            onClick={dismiss}
          />
          <div
            className="rider-install-prompt fixed bottom-0 left-0 right-0 z-[9999] rounded-t-3xl overflow-hidden"
            style={{
              background: '#0f172a',
              border: '1px solid rgba(245,158,11,0.25)',
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(245,158,11,0.3)' }} />
            </div>

            <div className="px-6 pt-3 pb-5">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  🛵
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    Install Rider App
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: '#f59e0b' }}>
                    Your dedicated delivery dashboard
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                {[
                  { step: '1', title: 'Tap the Share button', sub: 'At the bottom of Safari', color: '#3b9ef5', icon: '⬆️' },
                  { step: '2', title: 'Tap "Add to Home Screen"', sub: 'Scroll down in the share sheet', color: '#10b981', icon: '➕' },
                  { step: '3', title: 'Tap "Add" to confirm', sub: 'Rider app appears on your home screen', color: '#f59e0b', icon: '✅' },
                ].map(({ step, title, sub, color, icon }) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${color}22`, border: `1px solid ${color}44` }}
                    >
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={dismiss}
                className="w-full py-3.5 rounded-2xl text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                  color: '#0f172a',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
                }}
              >
                Got it! 🚀
              </button>
              <button onClick={dismiss} className="mt-2 w-full py-2 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Maybe later
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Android — compact banner */
        <div
          className="rider-install-prompt fixed z-[9999] flex justify-center px-4"
          style={{ bottom: 'calc(72px + max(env(safe-area-inset-bottom), 16px) + 12px)', left: 0, right: 0 }}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: '#1e293b',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
          >
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #d97706, #f59e0b)' }} />
            <div className="p-4 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                🛵
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">Install Rider App</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Quick access to your delivery dashboard
                </p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={installAndroid}
                  disabled={installing}
                  className="text-xs font-bold px-4 py-2 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                    color: '#0f172a',
                    opacity: installing ? 0.7 : 1,
                    minWidth: 72,
                  }}
                >
                  {installing ? 'Opening…' : 'Install'}
                </button>
                <button onClick={dismiss} className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}