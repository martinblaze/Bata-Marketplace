// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'BATAMART-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function main() {
  console.log('🌱 Starting database seeding...')

  await createAdmin()

  console.log('✅ Seeding completed successfully!')
}

async function createAdmin() {
  console.log('👤 Checking for existing admin...')

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (existingAdmin) {
    console.log('📋 Admin already exists:')
    console.log(`   - Email: ${existingAdmin.email}`)
    console.log(`   - Name: ${existingAdmin.name}`)
    console.log(`   - ID: ${existingAdmin.id}`)
    return
  }

  console.log('🔐 Creating new admin...')

  const plainPassword = 'Admin@12345'
  const hashedPassword = await bcrypt.hash(plainPassword, 10)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@BATAMART.com',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      phone: '08013579111',
      referralCode: generateReferralCode(),
    }
  })

  console.log('✅ Admin created successfully!')
  console.log('📧 Email:', admin.email)
  console.log('🔑 Password:', plainPassword)
  console.log('👤 Role:', admin.role)
  console.log('🆔 ID:', admin.id)

  const verifyHash = await bcrypt.compare(plainPassword, hashedPassword)
  console.log('🔒 Password hash valid:', verifyHash ? '✓ Yes' : '✗ No')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })