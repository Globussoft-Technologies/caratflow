'use client';

import { cn } from '@caratflow/ui';
import { Star } from 'lucide-react';

interface ReviewStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md';
}

export function ReviewStars({ rating, maxRating = 5, size = 'sm' }: ReviewStarsProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }, (_, i) => (
        <Star
          key={i}
          className={cn(
            iconSize,
            i < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-muted text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  );
}
