// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')
  
  // Create admin user
  await createAdmin()
  
  console.log('✅ Seeding completed successfully!')
}

async function createAdmin() {
  console.log('👤 Checking for existing admin...')
  
  // Check if admin already exists
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

  // Create new admin
  console.log('🔐 Creating new admin...')
  
  const plainPassword = 'Admin@12345'
  const hashedPassword = await bcrypt.hash(plainPassword, 10)
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@bata.com',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      phone: '08013579111',
      // ✅ Remove 'isVerified' if it doesn't exist in your schema
      // If you need verification, add it to your Prisma schema first
    }
  })

  console.log('✅ Admin created successfully!')
  console.log('📧 Email:', admin.email)
  console.log('🔑 Password:', plainPassword)
  console.log('👤 Role:', admin.role)
  console.log('🆔 ID:', admin.id)
  
  // Verify password works
  const verifyHash = await bcrypt.compare(plainPassword, hashedPassword)
  console.log('🔒 Password hash valid:', verifyHash ? '✓ Yes' : '✗ No')
}

// ❌ Remove the entire createCategories function since 'category' doesn't exist
// If you need categories, you need to add them to your Prisma schema first

// Error handling
main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })