'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDate } from '@/components/format';

export default function OutstandingPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<string>('');

  const { data, isLoading } = trpc.wholesale.listOutstandingBalances.useQuery({
    filters: { entityType: (entityType || undefined) as never },
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outstanding & Credit"
        description="Outstanding balances (AR/AP) with aging."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Outstanding' },
        ]}
      />

      <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="h-9 rounded-md border px-2 text-sm">
        <option value="">All</option>
        <option value="CUSTOMER">Customer</option>
        <option value="SUPPLIER">Supplier</option>
      </select>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Type</span>
          <span>Reference</span>
          <span>Original</span>
          <span>Balance</span>
          <span>Due Date</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="No outstanding balances" />
        ) : (
          <div className="divide-y">
            {items.map((o) => (
              <div key={o.id as string} className="grid grid-cols-[1fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{o.entityType as string}</span>
                <span className="font-mono text-xs">{(o.referenceNumber as string) ?? '-'}</span>
                <span>{formatPaise(o.originalAmountPaise)}</span>
                <span className="font-semibold">{formatPaise(o.balanceAmountPaise)}</span>
                <span className="text-muted-foreground">{formatDate(o.dueDate)}</span>
                <StatusBadge label={(o.status as string) ?? '-'} variant="default" />
              </div>
            ))}
          </div>
        )}
      </div>

      {data && (
        <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />
      )}
    </div>
  );
}
