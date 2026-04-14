'use client';

import { useState } from 'react';
import { PageHeader, EmptyState } from '@caratflow/ui';
import { Globe } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDateTime } from '@/components/format';

export default function ExchangeRatesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.export.listExchangeRates.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Exchange Rates" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Export', href: '/export' },
        { label: 'Exchange Rates' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>From</span>
          <span>To</span>
          <span>Rate</span>
          <span>Recorded</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Globe className="h-8 w-8" />} title="No rates recorded" />
        ) : (
          <div className="divide-y">
            {items.map((r) => (
              <div key={r.id as string} className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{(r.fromCurrency as string) ?? '-'}</span>
                <span>{(r.toCurrency as string) ?? '-'}</span>
                <span className="font-mono">{String(r.rate ?? '-')}</span>
                <span className="text-muted-foreground">{formatDateTime(r.recordedAt ?? r.createdAt)}</span>
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
