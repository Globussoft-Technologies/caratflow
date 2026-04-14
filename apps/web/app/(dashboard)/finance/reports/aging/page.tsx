'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function AgingReportPage() {
  const [type, setType] = useState<'AR' | 'AP'>('AR');
  const { data, isLoading } = trpc.financial.reports.aging.useQuery({ type });
  const rows = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Aging Report" description="Receivables or payables aged by bucket." breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'Reports', href: '/finance/reports' },
        { label: 'Aging' },
      ]} />

      <select value={type} onChange={(e) => setType(e.target.value as 'AR' | 'AP')} className="h-9 rounded-md border px-2 text-sm">
        <option value="AR">Accounts Receivable</option>
        <option value="AP">Accounts Payable</option>
      </select>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Entity</span>
          <span>Current</span>
          <span>1-30</span>
          <span>31-60</span>
          <span>61-90</span>
          <span>90+</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No data</div>
        ) : (
          <div className="divide-y">
            {rows.map((r, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(r.entityName as string) ?? '-'}</span>
                <span>{formatPaise(r.currentPaise)}</span>
                <span>{formatPaise(r.overdue30Paise)}</span>
                <span>{formatPaise(r.overdue60Paise)}</span>
                <span>{formatPaise(r.overdue90Paise)}</span>
                <span>{formatPaise(r.overdue120PlusPaise)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
