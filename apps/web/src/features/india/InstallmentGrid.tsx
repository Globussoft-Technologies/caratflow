'use client';

import * as React from 'react';
import { cn } from '@caratflow/ui';

interface InstallmentGridProps {
  totalInstallments: number;
  paidInstallments: number;
  overdueInstallments?: number;
  className?: string;
}

export function InstallmentGrid({
  totalInstallments,
  paidInstallments,
  overdueInstallments = 0,
  className,
}: InstallmentGridProps) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {Array.from({ length: totalInstallments }, (_, i) => {
        const month = i + 1;
        const isPaid = month <= paidInstallments;
        const isOverdue = !isPaid && month <= paidInstallments + overdueInstallments;
        const isCurrent = month === paidInstallments + 1 && !isOverdue;

        let bgClass = 'bg-muted text-muted-foreground';
        if (isPaid) bgClass = 'bg-emerald-500 text-white';
        else if (isOverdue) bgClass = 'bg-red-500 text-white';
        else if (isCurrent) bgClass = 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200';

        return (
          <div
            key={month}
            className={`flex h-7 w-7 items-center justify-center rounded text-xs font-medium ${bgClass}`}
            title={`#${month}: ${isPaid ? 'Paid' : isOverdue ? 'Overdue' : isCurrent ? 'Due' : 'Upcoming'}`}
          >
            {month}
          </div>
        );
      })}
    </div>
  );
}
