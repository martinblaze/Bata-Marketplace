// lib/referral/generateReferralCode.ts
// Utility to generate unique BATA-XXXXXX referral codes

import { prisma } from '@/lib/prisma'

/**
 * Generates a unique referral code in the format BATA-XXXXXX
 * Retries up to 10 times to avoid collisions.
 */
export async function generateUniqueReferralCode(): Promise<string> {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const MAX_ATTEMPTS = 10

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let suffix = ''
    for (let i = 0; i < 6; i++) {
      suffix += CHARS[Math.floor(Math.random() * CHARS.length)]
    }
    const code = `BATA-${suffix}`

    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })

    if (!existing) return code
  }

  // Fallback: use timestamp-based code (virtually no collision risk)
  return `BATA-${Date.now().toString(36).toUpperCase().slice(-6)}`
}