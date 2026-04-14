'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Wrench, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDate } from '@/components/format';

export default function RepairsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, isLoading } = trpc.retail.listRepairOrders.useQuery({
    filters: { status: (status || undefined) as never },
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repair Orders"
        description="Track repair jobs and customer pieces."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Repairs' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Repair
          </button>
        }
      />

      <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 rounded-md border px-2 text-sm">
        <option value="">All</option>
        <option value="RECEIVED">Received</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="READY">Ready</option>
        <option value="DELIVERED">Delivered</option>
      </select>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.4fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Repair #</span>
          <span>Customer</span>
          <span>Item</span>
          <span>Estimated Cost</span>
          <span>Status</span>
          <span>Promised By</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Wrench className="h-8 w-8" />} title="No repairs" />
        ) : (
          <div className="divide-y">
            {items.map((r) => {
              const customer = r.customer as { firstName?: string; lastName?: string } | undefined;
              const name = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : '-';
              return (
                <Link key={r.id as string} href={`/retail/repairs/${r.id}`} className="grid grid-cols-[1.2fr_1.4fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                  <span className="font-mono font-medium">{(r.repairNumber as string) ?? '-'}</span>
                  <span>{name || '-'}</span>
                  <span>{(r.itemDescription as string) ?? '-'}</span>
                  <span>{formatPaise(r.estimatedCostPaise)}</span>
                  <StatusBadge label={(r.status as string) ?? '-'} variant={getStatusVariant(r.status as string)} dot={false} />
                  <span className="text-muted-foreground">{formatDate(r.promisedDeliveryDate)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {data && <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />}
    </div>
  );
}
