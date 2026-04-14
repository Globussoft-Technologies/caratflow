'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Gstr1Page() {
  const [period, setPeriod] = useState(currentPeriod());
  const { data, isLoading } = trpc.financial.tax.gstr1.useQuery({ period } as never);
  return (
    <div className="space-y-6">
      <PageHeader title="GSTR-1" description="Outward supplies return." breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'Tax', href: '/finance/tax' },
        { label: 'GSTR-1' },
      ]} />
      <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <pre className="rounded-lg border p-4 text-xs overflow-auto max-h-[60vh]">
          {JSON.stringify(data ?? {}, null, 2)}
        </pre>
      )}
    </div>
  );
}
