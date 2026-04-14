'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Plus, Truck } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function ConsignmentsInPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const { data, isLoading } = trpc.wholesale.listConsignmentsIn.useQuery({
    filters: { status: status || undefined },
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Consignments"
        description="Items received from suppliers on memo/consignment basis."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Consignments In' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Record Consignment
          </button>
        }
      />

      <select
        value={status}
        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        className="h-9 rounded-md border bg-transparent px-2 text-sm"
      >
        <option value="">All statuses</option>
        <option value="RECEIVED">Received</option>
        <option value="PARTIALLY_RETURNED">Partially Returned</option>
        <option value="PURCHASED">Purchased</option>
        <option value="RETURNED">Returned</option>
        <option value="EXPIRED">Expired</option>
      </select>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>Consignment #</span>
          <span>Supplier</span>
          <span>Status</span>
          <span>Received</span>
          <span>Due Date</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Truck className="h-8 w-8" />} title="No consignments" />
        ) : (
          <div className="divide-y">
            {items.map((c) => {
              const supplier = c.supplier as { name?: string } | undefined;
              return (
                <Link
                  key={c.id as string}
                  href={`/wholesale/consignments-in/${c.id}`}
                  className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent"
                >
                  <span className="font-mono font-medium">{c.consignmentNumber as string}</span>
                  <span>{supplier?.name ?? '-'}</span>
                  <StatusBadge label={(c.status as string).replace(/_/g, ' ')} variant={getStatusVariant(c.status as string)} dot={false} />
                  <span className="text-muted-foreground">{formatDate(c.receivedDate)}</span>
                  <span className="text-muted-foreground">{formatDate(c.dueDate)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {data && (
        <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />
      )}
    </div>
  );
}
