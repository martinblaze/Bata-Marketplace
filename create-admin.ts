import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // CHANGE THESE DETAILS! ↓↓↓
    const adminEmail = 'martinfreelancer27@gmail.com';
    const adminPhone = '+2348012345678'; // ⚠️ CHANGE THIS - must be unique!
    const adminPassword = 'martin2706'; // ⚠️ CHANGE THIS PASSWORD!
    const adminName = 'Martin Blaze';

    console.log('🔄 Creating admin account...\n');

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { phone: adminPhone }
        ]
      }
    });

    if (existingAdmin) {
      console.log('❌ Admin already exists!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('📱 Phone:', existingAdmin.phone);
      console.log('\n💡 You can login with your existing credentials');
      return;
    }

    // Create the admin user
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        phone: adminPhone,
        password: hashedPassword,
        name: adminName,
        role: 'ADMIN', // Set role to ADMIN
        isSellerMode: false,
      }
    });

    console.log('✅ SUCCESS! Admin account created!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', adminEmail);
    console.log('📱 Phone:    ', adminPhone);
    console.log('🔑 Password: ', adminPassword);
    console.log('👤 Name:     ', adminName);
    console.log('👔 Role:     ', admin.role);
    console.log('🆔 ID:       ', admin.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🌐 Login at: http://localhost:3000/admin-login\n');
    console.log('⚠️  SAVE THESE DETAILS!');
    console.log('⚠️  Change password after first login!\n');

  } catch (error: any) {
    console.error('❌ Error creating admin:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Run: npx prisma migrate dev');
    console.error('3. Run: npx prisma generate');
    console.error('4. Check DATABASE_URL in .env file');
    console.error('\n📝 Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();