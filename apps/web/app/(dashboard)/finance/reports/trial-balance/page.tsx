'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function TrialBalancePage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const { data, isLoading } = trpc.financial.reports.trialBalance.useQuery({
    dateRange: { from: new Date(from), to: new Date(to) },
  });
  const rows = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Trial Balance" description="Accounts with debit/credit balances." breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'Reports', href: '/finance/reports' },
        { label: 'Trial Balance' },
      ]} />

      <div className="flex gap-3">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Account</span>
          <span className="text-right">Debit</span>
          <span className="text-right">Credit</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No data</div>
        ) : (
          <div className="divide-y">
            {rows.map((r, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{(r.accountName as string) ?? '-'}</span>
                <span className="text-right">{formatPaise(r.debitPaise)}</span>
                <span className="text-right">{formatPaise(r.creditPaise)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
