'use client';

import { cn } from '@caratflow/ui';

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  INITIATED: { label: 'Initiated', className: 'bg-gray-100 text-gray-700' },
  AUTHORIZED: { label: 'Authorized', className: 'bg-blue-100 text-blue-700' },
  CAPTURED: { label: 'Captured', className: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  REFUNDED: { label: 'Refunded', className: 'bg-orange-100 text-orange-700' },
  PARTIALLY_REFUNDED: { label: 'Partial Refund', className: 'bg-yellow-100 text-yellow-700' },
};

interface PaymentStatusBadgeProps {
  status: string;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = paymentStatusConfig[status] ?? paymentStatusConfig.INITIATED;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
