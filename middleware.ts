// middleware.ts (place in project root, same level as /app)
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect all /admin routes except /admin-login
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    const token = req.cookies.get('adminToken')?.value

    // No token = redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }

    // Basic check - just verify token exists and looks like a JWT
    // (Full verification happens in each API route)
    const parts = token.split('.')
    if (parts.length !== 3) {
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }

    // Token exists and is JWT shaped - allow through
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}