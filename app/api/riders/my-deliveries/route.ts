export const dynamic = 'force-dynamic'
// app/api/riders/my-deliveries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'RIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deliveries = await prisma.order.findMany({
      where: { 
        riderId: user.id,
        status: { in: ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'] },
      },
      include: {
        product: true,
        seller: { select: { name: true, phone: true } },
        buyer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ deliveries })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 })
  }
}
