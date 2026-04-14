'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Package, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function ConsignmentsOutPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.wholesale.listConsignmentsOut.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outgoing Consignments"
        description="Memo/consignment items sent to customers for approval."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Consignments Out' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Consignment
          </button>
        }
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>Consignment #</span>
          <span>Customer</span>
          <span>Status</span>
          <span>Issued</span>
          <span>Due</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Package className="h-8 w-8" />} title="No outgoing consignments" />
        ) : (
          <div className="divide-y">
            {items.map((c) => {
              const customer = c.customer as { firstName?: string; lastName?: string } | undefined;
              const name = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : '-';
              return (
                <Link
                  key={c.id as string}
                  href={`/wholesale/consignments-out/${c.id}`}
                  className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent"
                >
                  <span className="font-mono font-medium">{c.consignmentNumber as string}</span>
                  <span>{name || '-'}</span>
                  <StatusBadge label={(c.status as string).replace(/_/g, ' ')} variant={getStatusVariant(c.status as string)} dot={false} />
                  <span className="text-muted-foreground">{formatDate(c.issuedDate)}</span>
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
