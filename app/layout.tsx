import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'

import { NavbarWrapper } from '@/components/layout/NavbarWrapper'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { NotificationPrompt } from '@/hooks/usePushSubscription'
import { SuspensionGuard } from '@/components/layout/SuspensionGuard'

// 🔥 PWA + UX
import PWARegister from '@/components/PWARegister'
import SplashScreen from '@/components/SplashScreen'
import InstallPrompt from '@/components/InstallPrompt'
import IosInstallPrompt from '@/components/IosInstallPrompt'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BATAMART - UNIZIK Campus Marketplace',
  description: 'Student-to-student commerce at UNIZIK. Buy, sell, and deliver within campus.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BataMart',
  },
}

// ✅ PROPER NEXT.JS VIEWPORT EXPORT
// This is the ONLY reliable way to lock zoom across ALL route transitions
// in Next.js App Router. A raw <meta> tag in <head> gets overridden by
// Next.js during client-side navigation — this export doesn't.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
  // ✅ KEY FIX for bottom nav + keyboard:
  // 'resizes-visual' means only the VISUAL viewport shrinks when the keyboard
  // opens — the LAYOUT viewport (where `fixed` positioning is anchored) stays
  // full height. So `fixed bottom-0` never moves regardless of keyboard state.
  interactiveWidget: 'resizes-visual',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="BataMart" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="BataMart" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/*
          ── BULLETPROOF ZOOM KILLER ──────────────────────────────────────────
          The viewport export above handles the meta tag, but iOS Safari can
          STILL allow pinch zoom even with user-scalable=no in some versions.
          This JS kills it at the touch-event level — works on every page,
          survives every route transition because it's registered once on the
          document at app boot.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Kill pinch-to-zoom via touch events (iOS Safari bypass)
                document.addEventListener('gesturestart', function(e) {
                  e.preventDefault();
                }, { passive: false });
                document.addEventListener('gesturechange', function(e) {
                  e.preventDefault();
                }, { passive: false });
                document.addEventListener('gestureend', function(e) {
                  e.preventDefault();
                }, { passive: false });
                document.addEventListener('touchmove', function(e) {
                  if (e.touches && e.touches.length > 1) {
                    e.preventDefault();
                  }
                }, { passive: false });
              })();
            `,
          }}
        />

        {/*
          ── BULLETPROOF SPLASH BLOCKER ──────────────────────────────────────
          Runs SYNCHRONOUSLY before React hydrates — zero flash guaranteed.
          Hides body immediately if splash is needed, shows it only after
          SplashScreen component calls unblockPage().
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || window.navigator.standalone === true;
                  var isAppParam = window.location.search.indexOf('app=true') !== -1;
                  var isAndroid = window.location.search.indexOf('android=true') !== -1;
                  var splashShown = sessionStorage.getItem('batamart_splash_app');

                  if (!isAndroid && (isStandalone || isAppParam) && !splashShown) {
                    document.documentElement.classList.add('splash-pending');
                    document.addEventListener('DOMContentLoaded', function() {
                      var style = document.createElement('style');
                      style.textContent = 'body > *:not(#__splash_screen) { visibility: hidden !important; }';
                      document.head.appendChild(style);
                    });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />

        {/*
          ── INSTANT BODY HIDE ────────────────────────────────────────────────
          This <style> tag is parsed by the browser BEFORE any JS runs.
          It hides body content the moment the HTML is received, before
          React, before hydration, before anything. The splash-pending class
          is what gates it — added by the script above synchronously.
        */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html.splash-pending body > * {
              visibility: hidden !important;
              pointer-events: none !important;
            }
            html.splash-pending #__splash_screen {
              visibility: visible !important;
              pointer-events: auto !important;
            }
          `
        }} />
      </head>

      <body className={inter.className}>
        <ThemeProvider>
          <PWARegister />
          <SplashScreen />
          <InstallPrompt />
          <IosInstallPrompt />
          <SuspensionGuard />
          <NavbarWrapper />
          {/*
            Plain div — no fixed positioning wrapper.
            NavbarWrapper already outputs the correct spacer divs (h-14 / h-16)
            so content starts below the navbar naturally.
            The navbar itself is kept fixed via its own CSS + GPU layer forcing
            in globals.css and the willChange/translateZ on the nav element.
          */}
          <div id="page-scroll-container">
            {children}
          </div>
          <NotificationPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}