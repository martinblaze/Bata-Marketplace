import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { NotificationPrompt } from '@/hooks/usePushSubscription'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BATA - UNIZIK Campus Marketplace',
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
          <Navbar />
          {/* Add padding-top to account for fixed navbar */}
          <div className="pt-16">
            {children}
          </div>
          <NotificationPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}