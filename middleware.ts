// middleware.ts (place in project root, same level as /app)
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect all /admin routes except /admin-login
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    const token = req.cookies.get('adminToken')?.value

    // No token = redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }

    // Invalid/expired token = redirect to login
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        isAdmin: boolean
        role: string
      }

      if (!decoded.isAdmin || decoded.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/admin-login', req.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}