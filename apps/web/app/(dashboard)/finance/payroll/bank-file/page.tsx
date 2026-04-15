'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Landmark, Download } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function BankFilePage() {
  const [periodId, setPeriodId] = useState('');
  const { data: periods } = trpc.payroll.payrollPeriods.list.useQuery();
  const items = ((periods as Array<Record<string, unknown>> | undefined) ?? []);
  const genMut = trpc.payroll.bankFile.generate.useMutation();

  const result = genMut.data as
    | { csv?: string; totalPaise?: string; filename?: string; rows?: unknown[] }
    | undefined;

  const download = () => {
    if (!result?.csv) return;
    const blob = new Blob([result.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename ?? 'payroll.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="NEFT Bank File"
        description="Generate bank transfer CSV for a payroll period."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payroll', href: '/finance/payroll' },
          { label: 'Bank File' },
        ]}
      />

      <div className="rounded-lg border p-5 space-y-3">
        <select
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Select period...</option>
          {items.map((p) => (
            <option key={p.id as string} value={p.id as string}>
              {p.periodLabel as string} ({p.status as string})
            </option>
          ))}
        </select>
        <div>
          <button
            onClick={() => genMut.mutate({ periodId } as never)}
            disabled={!periodId || genMut.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Landmark className="h-4 w-4" />
            {genMut.isPending ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {result && (
          <div className="space-y-3 rounded border bg-muted/30 p-4">
            <div className="text-sm">
              Rows: <b>{(result.rows ?? []).length}</b> · Total:{' '}
              <b>{formatPaise(result.totalPaise)}</b>
            </div>
            <button
              onClick={download}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> Download CSV
            </button>
            <pre className="max-h-64 overflow-auto rounded bg-background p-3 text-xs font-mono">
              {result.csv ?? ''}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
