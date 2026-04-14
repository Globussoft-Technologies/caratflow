'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Receipt, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDateTime } from '@/components/format';

export default function SalesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = trpc.retail.listSales.useQuery({
    filters: { search: search || undefined },
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Point-of-sale transactions and billing history."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Sales' },
        ]}
        actions={
          <Link href="/retail/pos" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Sale
          </Link>
        }
      />

      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by invoice or customer..."
        className="h-9 w-72 rounded-md border bg-transparent px-3 text-sm"
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Invoice</span>
          <span>Customer</span>
          <span>Total</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Receipt className="h-8 w-8" />} title="No sales yet" />
        ) : (
          <div className="divide-y">
            {items.map((s) => {
              const customer = s.customer as { firstName?: string; lastName?: string } | undefined;
              const name = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Walk-in';
              return (
                <Link
                  key={s.id as string}
                  href={`/retail/sales/${s.id}`}
                  className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent"
                >
                  <span className="font-mono font-medium">{(s.invoiceNumber as string) ?? '-'}</span>
                  <span>{name || 'Walk-in'}</span>
                  <span className="font-semibold">{formatPaise(s.totalPaise)}</span>
                  <StatusBadge label={(s.status as string) ?? '-'} variant={getStatusVariant(s.status as string)} dot={false} />
                  <span className="text-muted-foreground">{formatDateTime(s.saleDate ?? s.createdAt)}</span>
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
