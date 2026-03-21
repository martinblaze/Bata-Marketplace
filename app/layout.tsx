import type { Metadata } from 'next'
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
  themeColor: '#0ea5e9',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BataMart',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
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
        <meta name="theme-color" content="#0ea5e9" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

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
            ── PAGE SCROLL CONTAINER ────────────────────────────────────────
            The page scrolls inside this div, NOT via window.
            This means position:fixed elements (bottom nav) are completely
            outside the scroll context — WebView can NEVER drag them along.
            The Navbar scroll listener reads from this element's scrollTop.
          */}
          <div
            id="page-scroll-container"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </div>
          <NotificationPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}