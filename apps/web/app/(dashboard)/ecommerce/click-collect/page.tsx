'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Package } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function ClickCollectPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.ecommerce.listClickCollects.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Click & Collect" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Click & Collect' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Order #</span>
          <span>Location</span>
          <span>Customer</span>
          <span>Status</span>
          <span>Pickup By</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Package className="h-8 w-8" />} title="No click & collect orders" />
        ) : (
          <div className="divide-y">
            {items.map((c) => (
              <div key={c.id as string} className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono">{(((c.order as { orderNumber?: string })?.orderNumber)) ?? '-'}</span>
                <span>{(((c.location as { name?: string })?.name)) ?? '-'}</span>
                <span>{(c.customerName as string) ?? '-'}</span>
                <StatusBadge label={(c.status as string) ?? '-'} variant="default" />
                <span className="text-muted-foreground">{formatDate(c.pickupByDate)}</span>
              </div>
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
