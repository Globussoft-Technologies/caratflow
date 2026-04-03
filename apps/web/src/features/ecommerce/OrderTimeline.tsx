'use client';

import { cn } from '@caratflow/ui';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';

interface OrderTimelineProps {
  placedAt: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  status: string;
}

const steps = [
  { key: 'placedAt', label: 'Order Placed' },
  { key: 'confirmedAt', label: 'Confirmed' },
  { key: 'shippedAt', label: 'Shipped' },
  { key: 'deliveredAt', label: 'Delivered' },
] as const;

export function OrderTimeline({
  placedAt,
  confirmedAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
  status,
}: OrderTimelineProps) {
  const timestamps: Record<string, string | null> = {
    placedAt,
    confirmedAt,
    shippedAt,
    deliveredAt,
  };

  const isCancelled = status === 'CANCELLED' || status === 'REFUNDED';

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Order Timeline</h3>
      <div className="relative">
        {steps.map((step, index) => {
          const timestamp = timestamps[step.key];
          const isCompleted = !!timestamp;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Line + Dot */}
              <div className="flex flex-col items-center">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground/30" />
                )}
                {!isLast && (
                  <div
                    className={cn(
                      'w-px flex-1 min-h-[24px]',
                      isCompleted ? 'bg-primary' : 'bg-muted-foreground/20',
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className={cn('pb-4', isLast && 'pb-0')}>
                <p className={cn(
                  'text-sm font-medium',
                  !isCompleted && 'text-muted-foreground',
                )}>
                  {step.label}
                </p>
                {timestamp && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Cancelled/Refunded row */}
        {isCancelled && (
          <div className="flex gap-3 mt-2">
            <div className="flex flex-col items-center">
              <XCircle className="h-5 w-5 shrink-0 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">
                {status === 'CANCELLED' ? 'Cancelled' : 'Refunded'}
              </p>
              {cancelledAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(cancelledAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
