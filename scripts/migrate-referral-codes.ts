// scripts/migrate-referral-codes.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomCode(): string {
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return `BATA-${suffix}`
}

async function main() {
  // Find users without a referral code (existing users after migration)
  const users = await prisma.user.findMany({
    where:  { referralCode: '' },   // empty string default before migration
    select: { id: true },
  })

  console.log(`Found ${users.length} users needing referral codes`)

  let updated = 0
  for (const user of users) {
    let code: string
    let attempts = 0

    // Generate a unique code
    do {
      code = randomCode()
      const exists = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } })
      if (!exists) break
      attempts++
    } while (attempts < 20)

    await prisma.user.update({
      where: { id: user.id },
      data:  { referralCode: code! },
    })

    updated++
    if (updated % 100 === 0) console.log(`Updated ${updated}/${users.length}...`)
  }

  console.log(`✅ Done. Updated ${updated} users with referral codes.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())