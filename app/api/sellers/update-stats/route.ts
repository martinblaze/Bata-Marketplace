import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TrustLevel, ReviewType } from '@prisma/client';
import { updateSellerStats } from '@/lib/utils/seller-stats';

// POST endpoint for updating specific seller
export async function POST(req: NextRequest) {
  try {
    const { sellerId } = await req.json();

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID required' }, { status: 400 });
    }

    const result = await updateSellerStats(sellerId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating seller stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Recalculate stats for all sellers
export async function GET(req: NextRequest) {
  try {
    // Get all sellers
    const sellers = await prisma.user.findMany({
      where: {
        isSellerMode: true
      },
      select: {
        id: true
      }
    });

    const results = [];

    for (const seller of sellers) {
      // Get all seller reviews
      const sellerReviews = await prisma.review.findMany({
        where: {
          revieweeId: seller.id,
          type: 'SELLER' as ReviewType
        },
      });

      // Get all completed orders as seller
      const completedOrders = await prisma.order.count({
        where: {
          sellerId: seller.id,
          status: {
            in: ['DELIVERED', 'COMPLETED']
          }
        }
      });

      // Calculate average rating
      let avgRating = 0;
      const totalReviews = sellerReviews.length;

      if (totalReviews > 0) {
        const totalRating = sellerReviews.reduce((sum, review) => sum + review.rating, 0);
        avgRating = totalRating / totalReviews;
      }

      // Calculate trust level
      let trustLevel: TrustLevel = 'BRONZE';

      if (totalReviews >= 3) {
        if (avgRating >= 4.5 && totalReviews >= 10) {
          trustLevel = 'VERIFIED';
        } else if (avgRating >= 4.0 && totalReviews >= 5) {
          trustLevel = 'GOLD';
        } else if (avgRating >= 3.5) {
          trustLevel = 'SILVER';
        }
      }

      // Update seller stats
      await prisma.user.update({
        where: { id: seller.id },
        data: {
          avgRating,
          totalReviews,
          completedOrders,
          trustLevel: trustLevel,
        },
      });

      results.push({
        sellerId: seller.id,
        avgRating,
        totalReviews,
        completedOrders,
        trustLevel,
      });
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      results
    });
  } catch (error) {
    console.error('Error recalculating seller stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}