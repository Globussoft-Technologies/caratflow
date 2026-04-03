'use client';

import { cn } from '@caratflow/ui';
import { Tag, Percent } from 'lucide-react';

interface DiscountBadgeProps {
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y';
  value: number; // percent*100 or paise
  className?: string;
}

export function DiscountBadge({ name, discountType, value, className }: DiscountBadgeProps) {
  const displayValue =
    discountType === 'PERCENTAGE'
      ? `${(value / 100).toFixed(value % 100 === 0 ? 0 : 1)}%`
      : discountType === 'FIXED'
        ? `₹${(value / 100).toLocaleString('en-IN')}`
        : 'Deal';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400',
        className,
      )}
    >
      {discountType === 'PERCENTAGE' ? (
        <Percent className="h-3 w-3" />
      ) : (
        <Tag className="h-3 w-3" />
      )}
      {name}: {displayValue} off
    </span>
  );
}
