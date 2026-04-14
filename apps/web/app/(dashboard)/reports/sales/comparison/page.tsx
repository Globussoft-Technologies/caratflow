'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function SalesComparisonPage() {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const [p1From, setP1From] = useState(thisMonth.toISOString().slice(0, 10));
  const [p1To, setP1To] = useState(today.toISOString().slice(0, 10));
  const [p2From, setP2From] = useState(lastMonth.toISOString().slice(0, 10));
  const [p2To, setP2To] = useState(lastMonthEnd.toISOString().slice(0, 10));

  const { data, isLoading } = trpc.reporting.salesComparison.useQuery({
    period1: { from: new Date(p1From), to: new Date(p1To) },
    period2: { from: new Date(p2From), to: new Date(p2To) },
  });
  const d = (data as Record<string, unknown> | undefined) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Comparison" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Reports', href: '/reports' },
        { label: 'Sales', href: '/reports/sales' },
        { label: 'Comparison' },
      ]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Period 1</h3>
          <div className="flex gap-2">
            <input type="date" value={p1From} onChange={(e) => setP1From(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
            <input type="date" value={p1To} onChange={(e) => setP1To(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Period 2</h3>
          <div className="flex gap-2">
            <input type="date" value={p2From} onChange={(e) => setP2From(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
            <input type="date" value={p2To} onChange={(e) => setP2To(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Period 1 Revenue</span><span>{formatPaise(d.period1RevenuePaise)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Period 2 Revenue</span><span>{formatPaise(d.period2RevenuePaise)}</span></div>
          <div className="flex justify-between border-t pt-2 font-semibold"><span>Change</span><span>{String(d.changePercent ?? '-')}%</span></div>
        </div>
      )}
    </div>
  );
}
