export const dynamic = 'force-dynamic'
// app/api/riders/toggle-availability/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'RIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isAvailable: !user.isAvailable },
    })

    return NextResponse.json({ success: true, isAvailable: updatedUser.isAvailable })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle availability' }, { status: 500 })
  }
}
