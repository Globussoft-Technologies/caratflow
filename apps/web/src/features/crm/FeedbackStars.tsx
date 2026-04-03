'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@caratflow/ui/lib/utils';

interface FeedbackStarsProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizeMap = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export function FeedbackStars({
  rating,
  maxStars = 5,
  size = 'sm',
  interactive = false,
  onChange,
  className,
}: FeedbackStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayRating = hoverRating ?? rating;

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={cn(
            interactive && 'cursor-pointer hover:scale-110 transition-transform',
            !interactive && 'cursor-default',
          )}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(null)}
        >
          <Star
            className={cn(
              sizeMap[size],
              star <= displayRating
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  );
}
