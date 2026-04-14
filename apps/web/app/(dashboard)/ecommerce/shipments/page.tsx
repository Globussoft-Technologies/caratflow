'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Truck } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function ShipmentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.ecommerce.listShipments.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Shipments" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Shipments' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>AWB / Tracking</span>
          <span>Order</span>
          <span>Carrier</span>
          <span>Status</span>
          <span>Shipped</span>
          <span>Delivered</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Truck className="h-8 w-8" />} title="No shipments" />
        ) : (
          <div className="divide-y">
            {items.map((s) => (
              <div key={s.id as string} className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono">{(s.trackingNumber as string) ?? '-'}</span>
                <span className="font-mono text-xs">{(((s.order as { orderNumber?: string })?.orderNumber)) ?? '-'}</span>
                <span>{(s.carrier as string) ?? '-'}</span>
                <StatusBadge label={(s.status as string) ?? '-'} variant={getStatusVariant(s.status as string)} dot={false} />
                <span className="text-muted-foreground">{formatDate(s.shippedAt)}</span>
                <span className="text-muted-foreground">{formatDate(s.deliveredAt)}</span>
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
