'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Plus, ExternalLink, RefreshCw } from 'lucide-react';
import { ChannelBadge } from '@/features/ecommerce';

// Mock data -- in production from tRPC: ecommerce.listChannels
const channels = [
  { id: '1', name: 'Shopify Store', channelType: 'SHOPIFY', storeUrl: 'https://mystore.myshopify.com', isActive: true, lastSyncAt: '2026-04-04T10:30:00Z' },
  { id: '2', name: 'Amazon India', channelType: 'AMAZON', storeUrl: null, isActive: true, lastSyncAt: '2026-04-04T09:15:00Z' },
  { id: '3', name: 'Flipkart Marketplace', channelType: 'FLIPKART', storeUrl: null, isActive: false, lastSyncAt: '2026-03-20T14:00:00Z' },
  { id: '4', name: 'Instagram Shop', channelType: 'INSTAGRAM', storeUrl: 'https://instagram.com/myshop', isActive: true, lastSyncAt: null },
];

export default function ChannelsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Channels"
        description="Manage your online sales channels and integration settings."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Channels' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Channel
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((ch) => (
          <a
            key={ch.id}
            href={`/ecommerce/channels/${ch.id}`}
            className="rounded-lg border p-4 transition-colors hover:bg-accent"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChannelBadge channelType={ch.channelType} />
                <div>
                  <h3 className="text-sm font-medium">{ch.name}</h3>
                  <p className="text-xs text-muted-foreground">{ch.channelType}</p>
                </div>
              </div>
              <StatusBadge
                label={ch.isActive ? 'Active' : 'Inactive'}
                variant={ch.isActive ? 'success' : 'secondary'}
                dot
              />
            </div>

            {ch.storeUrl && (
              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                <span className="truncate">{ch.storeUrl}</span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              <span>
                {ch.lastSyncAt
                  ? `Last sync: ${new Date(ch.lastSyncAt).toLocaleString()}`
                  : 'Never synced'}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
