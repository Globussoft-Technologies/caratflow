'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function InventoryValuationReportPage() {
  const [method, setMethod] = useState<'cost' | 'market'>('cost');
  const { data, isLoading } = trpc.reporting.stockValuationReport.useQuery({ method });
  const d = (data as Record<string, unknown> | undefined) ?? {};
  const rows = ((d.items as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Valuation" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Reports', href: '/reports' },
        { label: 'Inventory', href: '/reports/inventory' },
        { label: 'Valuation' },
      ]} />
      <select value={method} onChange={(e) => setMethod(e.target.value as 'cost' | 'market')} className="h-9 rounded-md border px-2 text-sm">
        <option value="cost">Cost Method</option>
        <option value="market">Market Method</option>
      </select>
      <div className="rounded-lg border p-4">
        <div className="text-sm text-muted-foreground">Total Valuation</div>
        <div className="text-2xl font-bold">{formatPaise(d.totalValuePaise)}</div>
      </div>
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Product</span>
          <span>Qty</span>
          <span>Value</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No data</div>
        ) : (
          <div className="divide-y">
            {rows.slice(0, 100).map((r, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{((r.product as { name?: string })?.name) ?? '-'}</span>
                <span>{String(r.quantity ?? 0)}</span>
                <span className="font-semibold">{formatPaise(r.valuePaise)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
