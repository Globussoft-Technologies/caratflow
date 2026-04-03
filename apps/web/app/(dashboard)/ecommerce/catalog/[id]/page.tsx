'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { SyncStatusIndicator, ChannelBadge } from '@/features/ecommerce';

// Mock data -- in production from tRPC: ecommerce.getCatalogItem
const catalogItem = {
  id: '1',
  title: '22K Gold Necklace Set',
  description: 'Elegant 22K gold necklace set with traditional Indian design. Includes necklace and matching earrings.',
  productId: 'p1',
  channelId: 'ch1',
  channelType: 'SHOPIFY',
  externalProductId: '7890123456',
  externalVariantId: '45678901234',
  pricePaise: 125000_00,
  comparePricePaise: 145000_00,
  currencyCode: 'INR',
  status: 'ACTIVE',
  syncStatus: 'SYNCED',
  lastSyncAt: '2026-04-04T10:00:00Z',
  syncError: null,
  images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
  createdAt: '2026-02-01T08:00:00Z',
};

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

export default function CatalogItemDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={catalogItem.title}
        description="Catalog item details and sync history."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Catalog', href: '/ecommerce/catalog' },
          { label: catalogItem.title },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <RefreshCw className="h-4 w-4" />
            Re-sync
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Item Details */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Product Details</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Channel</span>
              <ChannelBadge channelType={catalogItem.channelType} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge
                label={catalogItem.status}
                variant={catalogItem.status === 'ACTIVE' ? 'success' : 'secondary'}
                dot={false}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="text-sm font-semibold">{formatPaise(catalogItem.pricePaise)}</span>
            </div>
            {catalogItem.comparePricePaise && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Compare Price</span>
                <span className="text-sm line-through text-muted-foreground">
                  {formatPaise(catalogItem.comparePricePaise)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Currency</span>
              <span className="text-sm">{catalogItem.currencyCode}</span>
            </div>
          </div>
          {catalogItem.description && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">{catalogItem.description}</p>
            </div>
          )}
        </div>

        {/* Sync Info */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sync Information</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sync Status</span>
              <SyncStatusIndicator status={catalogItem.syncStatus} error={catalogItem.syncError} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="text-sm">
                {catalogItem.lastSyncAt ? new Date(catalogItem.lastSyncAt).toLocaleString() : 'Never'}
              </span>
            </div>
            {catalogItem.externalProductId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">External Product ID</span>
                <span className="text-sm font-mono">{catalogItem.externalProductId}</span>
              </div>
            )}
            {catalogItem.externalVariantId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">External Variant ID</span>
                <span className="text-sm font-mono">{catalogItem.externalVariantId}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
