"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const DummyReview = ({ review }: { review: any }) => (
  <div style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
    <h4>{review.user}</h4>
    <p>Rating: {review.rating}/5</p>
    <p>{review.comment}</p>
  </div>
);

const ProductReviewsPage: React.FC = () => {
  const { productId } = useParams() as { productId: string };
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/products/${productId}/reviews`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setReviews(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
        setError("Could not load reviews. Please try again later.");
        setLoading(false);
      }
    };

    if (productId) fetchReviews();
  }, [productId]);

  if (loading) return <div>Loading reviews...</div>;
  if (error) return <div>Error: {error}</div>;
  if (reviews.length === 0) return <div>No reviews yet for this product.</div>;

  return (
    <div>
      <h1>Reviews for Product #{productId}</h1>
      {reviews.map((review: any, index) => (
        <DummyReview key={index} review={review} />
      ))}
      <Link href={`/products/${productId}`}>Back to Product Details</Link>
    </div>
  );
};

export default ProductReviewsPage;