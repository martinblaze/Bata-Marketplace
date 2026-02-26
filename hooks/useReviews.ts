'use client';

import { useState, useCallback } from 'react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  type: 'SELLER' | 'RIDER';
  createdAt: string;
  reviewer: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  order?: {
    product?: {
      name: string;
    };
  };
}

interface ReviewStats {
  avgRating: number;
  totalReviews: number;
  distribution: Array<{ rating: number; count: number }>;
}

export function useReviews() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReview = useCallback(async (
    orderId: string,
    rating: number,
    comment: string,
    type: 'SELLER' | 'RIDER'
  ): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating, comment, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserReviews = useCallback(async (
    userId: string,
    type?: 'SELLER' | 'RIDER',
    page = 1,
    limit = 20
  ): Promise<{ reviews: Review[]; stats: ReviewStats; total: number }> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId,
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (type) {
        params.append('type', type);
      }

      const response = await fetch(`/api/reviews?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reviews');
      }

      return {
        reviews: data.reviews,
        stats: {
          avgRating: data.reviews.length > 0 
            ? data.reviews.reduce((acc: number, r: Review) => acc + r.rating, 0) / data.reviews.length
            : 0,
          totalReviews: data.total,
          distribution: data.distribution || [],
        },
        total: data.total,
      };
    } catch (err: any) {
      setError(err.message);
      return { reviews: [], stats: { avgRating: 0, totalReviews: 0, distribution: [] }, total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    submitReview,
    fetchUserReviews,
    loading,
    error,
    clearError: () => setError(null),
  };
}