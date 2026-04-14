'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';

export default function CrmReportsPage() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(first.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const { data, isLoading } = trpc.reporting.crmOverview.useQuery({
    dateRange: { from: new Date(from), to: new Date(to) },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="CRM Reports" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Reports', href: '/reports' },
        { label: 'CRM' },
      ]} />
      <div className="flex gap-3">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />
      </div>
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <pre className="rounded-lg border p-4 text-xs overflow-auto max-h-[60vh]">{JSON.stringify(data ?? {}, null, 2)}</pre>
      )}
    </div>
  );
}
