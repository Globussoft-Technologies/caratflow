'use client';

import { cn } from '@caratflow/ui';
import { CheckCircle2, AlertTriangle, Clock, XCircle, RefreshCw } from 'lucide-react';

const statusConfig: Record<string, {
  icon: typeof CheckCircle2;
  label: string;
  className: string;
  iconClassName: string;
}> = {
  SYNCED: {
    icon: CheckCircle2,
    label: 'Synced',
    className: 'text-green-700 bg-green-50',
    iconClassName: 'text-green-600',
  },
  PENDING: {
    icon: Clock,
    label: 'Pending',
    className: 'text-yellow-700 bg-yellow-50',
    iconClassName: 'text-yellow-600',
  },
  FAILED: {
    icon: XCircle,
    label: 'Failed',
    className: 'text-red-700 bg-red-50',
    iconClassName: 'text-red-600',
  },
  OUT_OF_SYNC: {
    icon: RefreshCw,
    label: 'Out of Sync',
    className: 'text-orange-700 bg-orange-50',
    iconClassName: 'text-orange-600',
  },
};

interface SyncStatusIndicatorProps {
  status: string;
  error?: string | null;
}

export function SyncStatusIndicator({ status, error }: SyncStatusIndicatorProps) {
  const config = statusConfig[status] ?? statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1" title={error ?? undefined}>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          config.className,
        )}
      >
        <Icon className={cn('h-3 w-3', config.iconClassName)} />
        {config.label}
      </span>
    </div>
  );
}
