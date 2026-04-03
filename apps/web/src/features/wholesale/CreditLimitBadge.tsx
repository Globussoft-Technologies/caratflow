'use client';

import { cn } from '@caratflow/ui';

interface CreditLimitBadgeProps {
  entityName: string;
  entityType: 'CUSTOMER' | 'SUPPLIER';
  creditLimitPaise: number;
  outstandingPaise: number;
  availablePaise: number;
  className?: string;
}

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `\u20B9${(rupees / 1000).toFixed(1)}K`;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

export function CreditLimitBadge({
  entityName,
  entityType,
  creditLimitPaise,
  outstandingPaise,
  availablePaise,
  className,
}: CreditLimitBadgeProps) {
  const utilizationPercent = creditLimitPaise > 0
    ? Math.round((outstandingPaise / creditLimitPaise) * 100)
    : 0;

  const isHighUtilization = utilizationPercent >= 80;
  const isCritical = utilizationPercent >= 95;

  return (
    <div className={cn('rounded-lg border p-4 space-y-3', className)}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold">{entityName}</h4>
          <p className="text-xs text-muted-foreground capitalize">{entityType.toLowerCase()}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            isCritical
              ? 'bg-red-100 text-red-700'
              : isHighUtilization
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700',
          )}
        >
          {utilizationPercent}% used
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isCritical
              ? 'bg-red-500'
              : isHighUtilization
                ? 'bg-amber-500'
                : 'bg-emerald-500',
          )}
          style={{ width: `${Math.min(100, utilizationPercent)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="text-muted-foreground">Limit</p>
          <p className="font-semibold">{formatPaise(creditLimitPaise)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Outstanding</p>
          <p className={cn('font-semibold', isHighUtilization ? 'text-amber-600' : '')}>
            {formatPaise(outstandingPaise)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Available</p>
          <p className={cn('font-semibold', isCritical ? 'text-red-600' : 'text-emerald-600')}>
            {formatPaise(availablePaise)}
          </p>
        </div>
      </div>
    </div>
  );
}
