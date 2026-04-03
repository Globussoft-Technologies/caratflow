'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { RefreshCw, Search, Filter } from 'lucide-react';
import { SyncStatusIndicator, ChannelBadge } from '@/features/ecommerce';

// Mock data -- in production from tRPC: ecommerce.listCatalogItems
const catalogItems = [
  { id: '1', title: '22K Gold Necklace Set', productId: 'p1', channelId: 'ch1', channelType: 'SHOPIFY', pricePaise: 125000_00, status: 'ACTIVE', syncStatus: 'SYNCED', lastSyncAt: '2026-04-04T10:00:00Z', syncError: null },
  { id: '2', title: 'Diamond Solitaire Ring', productId: 'p2', channelId: 'ch1', channelType: 'SHOPIFY', pricePaise: 85000_00, status: 'ACTIVE', syncStatus: 'OUT_OF_SYNC', lastSyncAt: '2026-04-03T14:00:00Z', syncError: null },
  { id: '3', title: '18K Gold Bangles (Set of 4)', productId: 'p3', channelId: 'ch2', channelType: 'AMAZON', pricePaise: 245000_00, status: 'ACTIVE', syncStatus: 'SYNCED', lastSyncAt: '2026-04-04T09:00:00Z', syncError: null },
  { id: '4', title: 'Pearl Earrings', productId: 'p4', channelId: 'ch1', channelType: 'SHOPIFY', pricePaise: 18000_00, status: 'DRAFT', syncStatus: 'PENDING', lastSyncAt: null, syncError: null },
  { id: '5', title: 'Kundan Bridal Set', productId: 'p5', channelId: 'ch3', channelType: 'INSTAGRAM', pricePaise: 350000_00, status: 'ACTIVE', syncStatus: 'FAILED', lastSyncAt: '2026-04-03T16:00:00Z', syncError: 'Rate limit exceeded' },
];

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Catalog"
        description="Manage synced products across all sales channels."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Catalog' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent">
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <RefreshCw className="h-4 w-4" />
              Bulk Sync
            </button>
          </div>
        }
      />

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search catalog items..."
          className="h-10 w-full rounded-md border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Catalog List */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Product</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Channel</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Price</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Sync</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {catalogItems.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-accent/50">
                <td className="p-3">
                  <a href={`/ecommerce/catalog/${item.id}`} className="text-sm font-medium hover:underline">
                    {item.title}
                  </a>
                </td>
                <td className="p-3">
                  <ChannelBadge channelType={item.channelType} />
                </td>
                <td className="p-3">
                  <span className="text-sm font-medium">{formatPaise(item.pricePaise)}</span>
                </td>
                <td className="p-3">
                  <StatusBadge
                    label={item.status}
                    variant={item.status === 'ACTIVE' ? 'success' : item.status === 'DRAFT' ? 'secondary' : 'warning'}
                    dot={false}
                  />
                </td>
                <td className="p-3">
                  <SyncStatusIndicator status={item.syncStatus} error={item.syncError} />
                </td>
                <td className="p-3">
                  <span className="text-xs text-muted-foreground">
                    {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'Never'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
