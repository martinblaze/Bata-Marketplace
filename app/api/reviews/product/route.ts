// app/api/reviews/product/route.ts - FULLY CORRECTED
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { updateSellerStats } from '@/lib/utils/seller-stats';

async function getUserFromToken(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

const productReviewSchema = z.object({
  orderId: z.string(),
  productId: z.string().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  type: z.literal('PRODUCT').optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, productId, rating, comment } = productReviewSchema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        seller: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.buyerId !== user.id) {
      return NextResponse.json({ error: 'Not your order' }, { status: 403 });
    }

    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Can only review delivered orders' },
        { status: 400 }
      );
    }

    const actualProductId = productId || order.productId;

    if (order.productId !== actualProductId) {
      return NextResponse.json(
        { error: 'Product does not match order' },
        { status: 400 }
      );
    }

    const existingReview = await prisma.productReview.findFirst({
      where: {
        orderId,
        productId: actualProductId,
        reviewerId: user.id,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════
    // ✅ TRANSACTION: ONLY database operations
    // ═══════════════════════════════════════════════════════
    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.productReview.create({
        data: {
          rating,
          comment: comment || '',
          orderId,
          productId: actualProductId,
          reviewerId: user.id,
        },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              profilePhoto: true,
            },
          },
        },
      });

      // Update product rating stats
      const reviews = await tx.productReview.findMany({
        where: { productId: actualProductId },
      });

      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / reviews.length;

        await tx.product.update({
          where: { id: actualProductId },
          data: {
            avgRating,
            totalReviews: reviews.length,
          },
        });
      }

      return newReview;
    }, {
      timeout: 15000,
      maxWait: 20000,
    });

    // ═══════════════════════════════════════════════════════
    // ✅ UPDATE SELLER STATS AFTER TRANSACTION
    // ═══════════════════════════════════════════════════════
    if (order.sellerId) {
      updateSellerStats(order.sellerId)
        .then(() => console.log('✅ Seller stats updated'))
        .catch(err => console.error('⚠️ Seller stats update failed:', err));
    }

    return NextResponse.json({ 
      success: true, 
      review,
      message: 'Product review submitted successfully' 
    });
  } catch (error) {
    console.error('Error creating product review:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const whereClause = { productId };

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: whereClause,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              profilePhoto: true,
            },
          },
          order: {
            select: {
              id: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productReview.count({
        where: whereClause,
      }),
    ]);

    const ratingDistribution = await prisma.productReview.groupBy({
      by: ['rating'],
      where: whereClause,
      _count: true,
    });

    const distribution = Array.from({ length: 5 }, (_, i) => ({
      rating: i + 1,
      count: ratingDistribution.find(r => r.rating === i + 1)?._count || 0,
    }));

    return NextResponse.json({
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      distribution,
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}