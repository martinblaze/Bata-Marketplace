import prisma from '@/lib/prisma';
import { TrustLevel, ReviewType } from '@prisma/client';

/**
 * Update seller statistics including ratings, reviews, and trust level
 * This utility can be called from any route that needs to update seller stats
 * 
 * FIXED: Now includes BOTH seller reviews AND product reviews in the calculation
 */
export async function updateSellerStats(sellerId: string) {
  try {
    // Get all seller reviews (reviews of the seller as a person)
    const sellerReviews = await prisma.review.findMany({
      where: {
        revieweeId: sellerId,
        type: 'SELLER' as ReviewType
      },
    });

    // Get all product reviews for products sold by this seller
    const productReviews = await prisma.productReview.findMany({
      where: {
        product: {
          sellerId: sellerId
        }
      },
    });

    // Get all completed orders as seller
    const completedOrders = await prisma.order.count({
      where: {
        sellerId,
        status: {
          in: ['DELIVERED', 'COMPLETED']
        }
      }
    });

    // Calculate average rating from BOTH seller reviews AND product reviews
    let avgRating = 0;
    const totalSellerReviews = sellerReviews.length;
    const totalProductReviews = productReviews.length;
    const totalReviews = totalSellerReviews + totalProductReviews;

    if (totalReviews > 0) {
      // Sum ratings from both seller reviews and product reviews
      const sellerRatingSum = sellerReviews.reduce((sum, review) => sum + review.rating, 0);
      const productRatingSum = productReviews.reduce((sum, review) => sum + review.rating, 0);
      const totalRating = sellerRatingSum + productRatingSum;
      
      avgRating = totalRating / totalReviews;
    }

    // Get total sales count (all delivered orders)
    const totalSales = await prisma.order.count({
      where: {
        product: { sellerId: sellerId },
        status: 'DELIVERED',
      },
    });

    // Calculate trust level based on combined reviews
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
    const updatedSeller = await prisma.user.update({
      where: { id: sellerId },
      data: {
        avgRating,
        totalReviews,
        completedOrders,
        trustLevel: trustLevel,
      },
    });

    return {
      success: true,
      stats: {
        avgRating,
        totalReviews,
        totalSellerReviews,
        totalProductReviews,
        completedOrders,
        totalSales,
        trustLevel,
      }
    };
  } catch (error) {
    console.error('Error updating seller stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
}