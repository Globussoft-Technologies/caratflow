'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Package } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDateTime } from '@/components/format';

export default function CatalogPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.ecommerce.listCatalogItems.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Catalog" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Catalog' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Product</span>
          <span>Channel</span>
          <span>Price</span>
          <span>Last Sync</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Package className="h-8 w-8" />} title="No catalog items" />
        ) : (
          <div className="divide-y">
            {items.map((c) => (
              <Link key={c.id as string} href={`/ecommerce/catalog/${c.id}`} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{(((c.product as { name?: string })?.name)) ?? (c.title as string) ?? '-'}</span>
                <span>{(((c.channel as { name?: string })?.name)) ?? '-'}</span>
                <span className="font-semibold">{formatPaise(c.pricePaise)}</span>
                <span className="text-muted-foreground">{formatDateTime(c.lastSyncAt)}</span>
                <StatusBadge label={(c.syncStatus as string) ?? '-'} variant="default" />
              </Link>
            ))}
          </div>
        )}
      </div>
      {d && d.totalPages && d.totalPages > 0 && (
        <PaginationControls page={d.page ?? 1} totalPages={d.totalPages} hasPrevious={d.hasPrevious ?? false} hasNext={d.hasNext ?? false} onChange={setPage} />
      )}
    </div>
  );
}
