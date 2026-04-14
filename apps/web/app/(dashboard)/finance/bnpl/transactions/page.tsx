'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { CreditCard } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDate } from '@/components/format';

export default function BnplTransactionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.bnpl.listTransactions.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  } as never);
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="BNPL Transactions" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'BNPL', href: '/finance/bnpl' },
        { label: 'Transactions' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Txn #</span>
          <span>Customer</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<CreditCard className="h-8 w-8" />} title="No transactions" />
        ) : (
          <div className="divide-y">
            {items.map((t) => (
              <div key={t.id as string} className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono">{(t.transactionNumber as string) ?? '-'}</span>
                <span>{(t.customerName as string) ?? '-'}</span>
                <span className="font-semibold">{formatPaise(t.amountPaise)}</span>
                <StatusBadge label={(t.status as string) ?? '-'} variant="default" />
                <span className="text-muted-foreground">{formatDate(t.createdAt)}</span>
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
