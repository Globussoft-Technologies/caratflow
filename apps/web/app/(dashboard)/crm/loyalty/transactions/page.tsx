'use client';

import { useState } from 'react';
import { PageHeader, EmptyState } from '@caratflow/ui';
import { Gift } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function LoyaltyTransactionsPage() {
  const [customerId, setCustomerId] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.crm.loyaltyTransactions.useQuery(
    { customerId, page, limit: 20 },
    { enabled: Boolean(customerId) },
  );
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty Transactions"
        description="Points earned, redeemed, and adjusted per customer."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Loyalty', href: '/crm/loyalty' },
          { label: 'Transactions' },
        ]}
      />

      <input
        type="text"
        placeholder="Customer ID (UUID) to view transactions"
        value={customerId}
        onChange={(e) => { setCustomerId(e.target.value); setPage(1); }}
        className="h-9 w-96 rounded-md border bg-transparent px-3 text-sm font-mono"
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Type</span>
          <span>Points</span>
          <span>Reference</span>
          <span>Date</span>
        </div>
        {!customerId ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Enter a customer ID to view transactions</div>
        ) : isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Gift className="h-8 w-8" />} title="No transactions" />
        ) : (
          <div className="divide-y">
            {items.map((t) => (
              <div key={t.id as string} className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{(t.type as string) ?? '-'}</span>
                <span className="font-medium">{String(t.points ?? 0)}</span>
                <span className="text-xs text-muted-foreground">{(t.referenceType as string) ?? ''}</span>
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
