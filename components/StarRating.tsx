'use client';

import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';

type StarRatingProps = {
  rating?: number; // Average rating (0-5)
  userRating?: number; // User's own rating (1-5)
  count?: number; // Number of ratings
  onRate?: (stars: number) => void; // Callback when user rates
  readonly?: boolean; // If true, cannot rate
  size?: 'sm' | 'md' | 'lg';
};

export function StarRating({
  rating = 0,
  userRating,
  count = 0,
  onRate,
  readonly = false,
  size = 'md',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const starSize = sizeClasses[size];

  const handleClick = useCallback((star: number) => {
    if (!readonly && onRate) {
      onRate(star);
    }
  }, [readonly, onRate]);

  // Display rating is either hover, user's rating, or average
  const displayRating = hoverRating || userRating || rating;

  return (
    <div className="flex items-center gap-1">
      <div
        className={`flex ${readonly ? '' : 'cursor-pointer'}`}
        onMouseLeave={() => !readonly && setHoverRating(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= displayRating;
          const halfFilled = !filled && star - 0.5 <= displayRating;

          return (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              onMouseEnter={() => !readonly && setHoverRating(star)}
              disabled={readonly}
              className={`${readonly ? '' : 'hover:scale-110'} transition-transform disabled:cursor-default`}
            >
              <Star
                className={`${starSize} ${
                  filled
                    ? 'fill-yellow-400 text-yellow-400'
                    : halfFilled
                    ? 'fill-yellow-400/50 text-yellow-400'
                    : 'text-neutral-300'
                }`}
              />
            </button>
          );
        })}
      </div>
      {count > 0 && (
        <span className="text-xs text-neutral-400 ml-1">
          {rating.toFixed(1)} ({count})
        </span>
      )}
      {userRating && !readonly && (
        <span className="text-xs text-neutral-500 ml-1">Your rating</span>
      )}
    </div>
  );
}

// Compact version for display only (like in a card)
export function StarRatingCompact({
  rating = 0,
  count = 0,
}: {
  rating: number;
  count: number;
}) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-0.5">
      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      <span className="text-xs text-neutral-600">{rating.toFixed(1)}</span>
      <span className="text-xs text-neutral-400">({count})</span>
    </div>
  );
}
