'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function PnlReportPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const { data, isLoading } = trpc.financial.reports.profitAndLoss.useQuery({
    dateRange: { from: new Date(from), to: new Date(to) },
  });
  const pnl = (data as Record<string, unknown> | undefined) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss"
        description="Income vs. expenses for a period."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Reports', href: '/finance/reports' },
          { label: 'P&L' },
        ]}
      />

      <div className="flex gap-3">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-lg border p-6 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total Revenue</span><span className="font-semibold">{formatPaise(pnl.totalRevenuePaise)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cost of Goods Sold</span><span>{formatPaise(pnl.cogsPaise)}</span></div>
          <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Gross Profit</span><span className="font-semibold">{formatPaise(pnl.grossProfitPaise)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Operating Expenses</span><span>{formatPaise(pnl.operatingExpensesPaise)}</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Net Profit</span><span>{formatPaise(pnl.netProfitPaise)}</span></div>
        </div>
      )}
    </div>
  );
}
