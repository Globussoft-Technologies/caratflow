'use client';

import { Gift } from 'lucide-react';
import { cn } from '@caratflow/ui';

interface LoyaltyBadgeProps {
  tier: string | null;
  points: number;
  className?: string;
}

const tierStyles: Record<string, string> = {
  BRONZE: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
  SILVER: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  GOLD: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
  PLATINUM: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
  DIAMOND: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300',
};

export function LoyaltyBadge({ tier, points, className }: LoyaltyBadgeProps) {
  const style = tier ? tierStyles[tier] ?? '' : 'bg-muted text-muted-foreground';

  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1', style, className)}>
      <Gift className="h-3.5 w-3.5" />
      <span className="text-sm font-medium">{points.toLocaleString('en-IN')} pts</span>
      {tier && <span className="text-xs font-semibold">{tier}</span>}
    </div>
  );
}
