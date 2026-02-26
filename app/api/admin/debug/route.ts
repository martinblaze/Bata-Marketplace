// app/api/admin/debug/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    // Find all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        phone: true
      }
    })

    return NextResponse.json({
      adminsFound: admins.length,
      admins: admins.map(a => ({
        ...a,
        password: a.password ? a.password.substring(0, 20) + '...' : 'NO PASSWORD'
      })),
      message: admins.length === 0 
        ? '❌ No admin found! Run the seed script.' 
        : '✅ Admin exists!'
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
} 