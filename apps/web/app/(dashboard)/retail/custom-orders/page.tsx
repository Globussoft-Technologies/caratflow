'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Sparkles, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDate } from '@/components/format';

export default function CustomOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.retail.listCustomOrders.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Orders"
        description="Bespoke orders and customer-specific commissions."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Custom Orders' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Order
          </button>
        }
      />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Order #</span>
          <span>Customer</span>
          <span>Quoted Price</span>
          <span>Status</span>
          <span>Delivery</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-8 w-8" />} title="No custom orders" />
        ) : (
          <div className="divide-y">
            {items.map((o) => {
              const c = o.customer as { firstName?: string; lastName?: string } | undefined;
              return (
                <div key={o.id as string} className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span className="font-mono">{(o.orderNumber as string) ?? '-'}</span>
                  <span>{c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : '-'}</span>
                  <span className="font-semibold">{formatPaise(o.quotedPricePaise)}</span>
                  <StatusBadge label={(o.status as string) ?? '-'} variant={getStatusVariant(o.status as string)} dot={false} />
                  <span className="text-muted-foreground">{formatDate(o.expectedDeliveryDate)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {data && <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />}
    </div>
  );
}
