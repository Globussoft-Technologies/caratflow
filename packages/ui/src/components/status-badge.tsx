'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
  muted: 'bg-muted text-muted-foreground border-border',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  muted: 'bg-muted-foreground',
};

export function StatusBadge({ label, variant = 'default', dot = true, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[variant])} />}
      {label}
    </span>
  );
}

/** Map common status strings to badge variants */
export function getStatusVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (['ACTIVE', 'COMPLETED', 'DELIVERED', 'PAID', 'APPROVED', 'VERIFIED'].includes(s)) return 'success';
  if (['PENDING', 'PROCESSING', 'IN_PROGRESS', 'PARTIAL'].includes(s)) return 'warning';
  if (['CANCELLED', 'FAILED', 'REJECTED', 'OVERDUE'].includes(s)) return 'danger';
  if (['DRAFT', 'INACTIVE'].includes(s)) return 'muted';
  if (['CONFIRMED', 'DISPATCHED', 'READY'].includes(s)) return 'info';
  return 'default';
}
