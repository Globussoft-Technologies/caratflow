'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Ship, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDate } from '@/components/format';

export default function ExportOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.export.listOrders.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Export Orders" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Export', href: '/export' },
        { label: 'Orders' },
      ]} actions={
        <Link href="/export/orders/new" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Order
        </Link>
      } />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Order #</span>
          <span>Buyer</span>
          <span>Country</span>
          <span>Value</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Ship className="h-8 w-8" />} title="No export orders" />
        ) : (
          <div className="divide-y">
            {items.map((o) => (
              <Link key={o.id as string} href={`/export/orders/${o.id}`} className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-mono font-medium">{(o.orderNumber as string) ?? '-'}</span>
                <span>{(o.buyerName as string) ?? '-'}</span>
                <span>{(o.destinationCountry as string) ?? '-'}</span>
                <span className="font-semibold">{formatPaise(o.totalValuePaise)}</span>
                <StatusBadge label={(o.status as string) ?? '-'} variant={getStatusVariant(o.status as string)} dot={false} />
                <span className="text-muted-foreground">{formatDate(o.orderDate)}</span>
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
