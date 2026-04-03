'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { RefreshCw, Settings, Trash2, ExternalLink } from 'lucide-react';
import { ChannelBadge } from '@/features/ecommerce';

// Mock data -- in production from tRPC: ecommerce.getChannel
const channel = {
  id: '1',
  name: 'Shopify Store',
  channelType: 'SHOPIFY',
  storeUrl: 'https://mystore.myshopify.com',
  isActive: true,
  lastSyncAt: '2026-04-04T10:30:00Z',
  settings: { autoSync: true, syncInterval: 30 },
  createdAt: '2026-01-15T08:00:00Z',
};

export default function ChannelDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={channel.name}
        description={`${channel.channelType} channel configuration and sync settings.`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Channels', href: '/ecommerce/channels' },
          { label: channel.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent">
              <RefreshCw className="h-4 w-4" />
              Sync Now
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Channel Info */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Channel Information</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <ChannelBadge channelType={channel.channelType} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge
                label={channel.isActive ? 'Active' : 'Inactive'}
                variant={channel.isActive ? 'success' : 'secondary'}
                dot
              />
            </div>
            {channel.storeUrl && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Store URL</span>
                <a
                  href={channel.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {channel.storeUrl.replace('https://', '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="text-sm">
                {channel.lastSyncAt ? new Date(channel.lastSyncAt).toLocaleString() : 'Never'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">{new Date(channel.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sync Settings</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auto Sync</span>
              <span className="text-sm font-medium">
                {(channel.settings as Record<string, unknown>)?.autoSync ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sync Interval</span>
              <span className="text-sm font-medium">
                {(channel.settings as Record<string, unknown>)?.syncInterval ?? 60} minutes
              </span>
            </div>
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              API credentials are configured securely. Use the settings panel to update keys and secrets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
