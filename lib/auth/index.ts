import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

// ─── Same JWT_SECRET as lib/auth/auth.ts ─────────────────────────────────────
// Both files must use the SAME secret. Never hardcode a fallback string.
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set.')
}

export interface AuthSession {
  user: {
    id: string
    email: string
    name: string | null
    role: string
  }
}

export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) return null

    const decoded = jwt.verify(token, JWT_SECRET!) as {
      userId: string
      email: string
      name: string | null
      role: string
    }

    return {
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
      },
    }
  } catch (error) {
    console.error('Auth session error:', error)
    return null
  }
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getAuthSession()
  if (!session) throw new Error('Unauthorized')
  return session
}