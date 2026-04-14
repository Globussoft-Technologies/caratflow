'use client';

import { useState } from 'react';
import { PageHeader, EmptyState } from '@caratflow/ui';
import { AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise } from '@/components/format';

export default function CreditPage() {
  const [page, setPage] = useState(1);
  const { data: limitsData, isLoading } = trpc.wholesale.listCreditLimits.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const { data: agingSummary } = trpc.wholesale.getAgingSummary.useQuery();
  const limits = ((limitsData?.items as Array<Record<string, unknown>>) ?? []);

  const buckets = (agingSummary as Record<string, { count: number; totalPaise: string | number }> | undefined) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit & Outstanding"
        description="Credit limits, outstanding payments, and aging reports."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Credit & Aging' },
        ]}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Aging Summary</h2>
        <div className="grid gap-4 sm:grid-cols-5">
          {['current', 'overdue30', 'overdue60', 'overdue90', 'overdue120Plus'].map((key) => {
            const b = buckets[key] ?? { count: 0, totalPaise: 0 };
            return (
              <div key={key} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">{key}</p>
                <p className="mt-1 text-lg font-bold">{formatPaise(b.totalPaise)}</p>
                <p className="text-xs text-muted-foreground">{b.count} invoices</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Credit Limits</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
            <span>Entity Type</span>
            <span>Entity ID</span>
            <span>Credit Limit</span>
            <span>Outstanding</span>
            <span>Available</span>
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : limits.length === 0 ? (
            <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="No credit limits set" />
          ) : (
            <div className="divide-y">
              {limits.map((l) => (
                <div key={l.id as string} className="grid grid-cols-[1fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span>{l.entityType as string}</span>
                  <span className="font-mono text-xs">{(l.entityId as string).slice(0, 8)}...</span>
                  <span>{formatPaise(l.creditLimitPaise)}</span>
                  <span>{formatPaise(l.currentOutstandingPaise)}</span>
                  <span className="font-semibold">{formatPaise(l.availableCreditPaise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {limitsData && (
          <PaginationControls
            page={limitsData.page}
            totalPages={limitsData.totalPages}
            hasPrevious={limitsData.hasPrevious}
            hasNext={limitsData.hasNext}
            onChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
