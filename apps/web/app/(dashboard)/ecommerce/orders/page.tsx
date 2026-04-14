'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { ShoppingCart } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDateTime } from '@/components/format';

export default function EcommerceOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.ecommerce.listOrders.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Online Orders" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Orders' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Order #</span>
          <span>Customer</span>
          <span>Total</span>
          <span>Status</span>
          <span>Placed</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<ShoppingCart className="h-8 w-8" />} title="No orders" />
        ) : (
          <div className="divide-y">
            {items.map((o) => (
              <Link key={o.id as string} href={`/ecommerce/orders/${o.id}`} className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-mono font-medium">{(o.orderNumber as string) ?? (o.externalOrderId as string) ?? '-'}</span>
                <span>{(o.customerName as string) ?? '-'}</span>
                <span className="font-semibold">{formatPaise(o.totalPaise)}</span>
                <StatusBadge label={(o.status as string) ?? '-'} variant={getStatusVariant(o.status as string)} dot={false} />
                <span className="text-muted-foreground">{formatDateTime(o.placedAt ?? o.createdAt)}</span>
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
