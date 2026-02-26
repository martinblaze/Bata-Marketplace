export const dynamic = 'force-dynamic'
// app/api/admin/support/[id]/route.ts  ← NOTE: [id] subfolder
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'ADMIN') return null
    return decoded
  } catch { return null }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { status, adminNotes } = await req.json()

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: params.id },
      data: {
        status,
        adminNotes: adminNotes?.trim() || null,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
      },
    })

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}