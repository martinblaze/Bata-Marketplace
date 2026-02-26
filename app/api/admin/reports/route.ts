// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { ReportStatus, ReportType, Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

async function getUserFromToken(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null

    try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        return await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, name: true, role: true }
        })
    } catch (error) {
        return null
    }
}

// GET: Fetch all reports (admin only)
export async function GET(req: NextRequest) {
    try {
        const admin = await getUserFromToken(req)
        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const statusParam = searchParams.get('status')
        const typeParam = searchParams.get('type')

        // Build the where clause with proper typing
        const where: Prisma.ReportWhereInput = {}

        if (statusParam && Object.values(ReportStatus).includes(statusParam as ReportStatus)) {
            where.status = statusParam as ReportStatus
        }

        if (typeParam && Object.values(ReportType).includes(typeParam as ReportType)) {
            where.type = typeParam as ReportType
        }

        const reports = await prisma.report.findMany({
            where,
            include: {
                reporter: {
                    select: { id: true, name: true, phone: true, profilePhoto: true }
                },
                reportedUser: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        profilePhoto: true,
                        penaltyPoints: true,
                        isSuspended: true
                    }
                },
                reportedProduct: {
                    select: { id: true, name: true, images: true, seller: { select: { name: true } } }
                },
                reportedOrder: {
                    select: { id: true, orderNumber: true, status: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        return NextResponse.json({ reports })
    } catch (error) {
        console.error('Error fetching reports:', error)
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }
}