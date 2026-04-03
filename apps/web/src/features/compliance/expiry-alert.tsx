'use client';

import { AlertTriangle, Clock } from 'lucide-react';

interface ExpiryAlertProps {
  count: number;
  label?: string;
  variant?: 'warning' | 'danger';
}

export function ExpiryAlert({ count, label = 'documents expiring within 30 days', variant = 'warning' }: ExpiryAlertProps) {
  if (count === 0) return null;

  const bgColor = variant === 'danger'
    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
    : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800';

  const textColor = variant === 'danger'
    ? 'text-red-800 dark:text-red-200'
    : 'text-amber-800 dark:text-amber-200';

  const Icon = variant === 'danger' ? AlertTriangle : Clock;

  return (
    <div className={`flex items-center gap-2 rounded-lg border p-3 ${bgColor}`}>
      <Icon className={`h-4 w-4 shrink-0 ${textColor}`} />
      <span className={`text-sm font-medium ${textColor}`}>
        {count} {label}
      </span>
    </div>
  );
}
