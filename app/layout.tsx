import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { NavbarWrapper } from '@/components/layout/NavbarWrapper'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { NotificationPrompt } from '@/hooks/usePushSubscription'
import { SuspensionGuard } from '@/components/layout/SuspensionGuard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BATAMART - UNIZIK Campus Marketplace',
  description: 'Student-to-student commerce at UNIZIK. Buy, sell, and deliver within campus.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {/* Polls /api/auth/me every 30s — force-logs out suspended users immediately */}
          <SuspensionGuard />
          <NavbarWrapper />
          <div>
            {children}
          </div>
          <NotificationPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}