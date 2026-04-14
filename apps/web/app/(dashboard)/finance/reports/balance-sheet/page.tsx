'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading } = trpc.financial.reports.balanceSheet.useQuery({ asOfDate: new Date(asOf) });
  const bs = (data as Record<string, unknown> | undefined) ?? {};
  const assets = (bs.assets as Array<Record<string, unknown>>) ?? [];
  const liabilities = (bs.liabilities as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance Sheet"
        description="Snapshot of assets and liabilities."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Reports', href: '/finance/reports' },
          { label: 'Balance Sheet' },
        ]}
      />

      <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Assets</h3>
            {assets.map((a, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1"><span className="text-muted-foreground">{(a.accountName as string) ?? '-'}</span><span>{formatPaise(a.balancePaise)}</span></div>
            ))}
            <div className="flex justify-between border-t pt-2 mt-2 text-base font-bold"><span>Total Assets</span><span>{formatPaise(bs.totalAssetsPaise)}</span></div>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Liabilities</h3>
            {liabilities.map((l, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1"><span className="text-muted-foreground">{(l.accountName as string) ?? '-'}</span><span>{formatPaise(l.balancePaise)}</span></div>
            ))}
            <div className="flex justify-between border-t pt-2 mt-2 text-base font-bold"><span>Total Liabilities</span><span>{formatPaise(bs.totalLiabilitiesPaise)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
