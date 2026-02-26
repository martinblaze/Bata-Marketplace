'use client';

import { Star, Shield } from 'lucide-react';

interface RatingBadgeProps {
  rating: number;
  reviewCount: number;
  trustLevel?: string;
  size?: 'sm' | 'md' | 'lg';
  showTrustLevel?: boolean;
}

export default function RatingBadge({
  rating,
  reviewCount,
  trustLevel,
  size = 'md',
  showTrustLevel = true,
}: RatingBadgeProps) {
  const sizeClasses = {
    sm: {
      star: 'w-3 h-3',
      text: 'text-xs',
      badge: 'px-2 py-0.5 text-xs',
    },
    md: {
      star: 'w-4 h-4',
      text: 'text-sm',
      badge: 'px-2 py-1 text-sm',
    },
    lg: {
      star: 'w-5 h-5',
      text: 'text-base',
      badge: 'px-3 py-1 text-base',
    },
  };

  const trustLevelColors = {
    BRONZE: 'bg-orange-100 text-orange-800 border-orange-200',
    SILVER: 'bg-gray-100 text-gray-800 border-gray-300',
    GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    VERIFIED: 'bg-green-100 text-green-800 border-green-300',
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Rating */}
      <div className="flex items-center gap-1">
        <Star className={`${classes.star} fill-yellow-400 text-yellow-400`} />
        <span className={`font-semibold ${classes.text}`}>
          {rating.toFixed(1)}
        </span>
        <span className={`text-gray-500 ${classes.text}`}>
          ({reviewCount})
        </span>
      </div>

      {/* Trust Level Badge */}
      {showTrustLevel && trustLevel && (
        <div
          className={`inline-flex items-center gap-1 rounded-full border font-medium ${classes.badge} ${
            trustLevelColors[trustLevel as keyof typeof trustLevelColors] ||
            trustLevelColors.BRONZE
          }`}
        >
          {trustLevel === 'VERIFIED' && <Shield className={classes.star} />}
          {trustLevel}
        </div>
      )}
    </div>
  );
}