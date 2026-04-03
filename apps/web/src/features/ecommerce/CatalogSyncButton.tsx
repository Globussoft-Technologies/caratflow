'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@caratflow/ui';

interface CatalogSyncButtonProps {
  channelId: string;
  channelName: string;
  onSync?: (channelId: string) => void;
}

export function CatalogSyncButton({ channelId, channelName, onSync }: CatalogSyncButtonProps) {
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      onSync?.(channelId);
      // In production, call tRPC: ecommerce.bulkSyncProducts
      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors',
        isSyncing
          ? 'cursor-not-allowed opacity-50'
          : 'hover:bg-accent',
      )}
    >
      <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
      {isSyncing ? `Syncing ${channelName}...` : `Sync to ${channelName}`}
    </button>
  );
}
