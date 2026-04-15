'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { LayoutGrid, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/components/format';

export default function PayrollPeriodsPage() {
  const [label, setLabel] = useState('');
  const { data, isLoading, refetch } = trpc.payroll.payrollPeriods.list.useQuery();
  const items = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  const createMut = trpc.payroll.payrollPeriods.create.useMutation({ onSuccess: () => refetch() });
  const processMut = trpc.payroll.payrollPeriods.process.useMutation({ onSuccess: () => refetch() });

  const handleCreate = async () => {
    if (!/^\d{4}-\d{2}$/.test(label)) {
      alert('Enter label like 2026-04');
      return;
    }
    const [y, m] = label.split('-').map(Number);
    await createMut.mutateAsync({
      periodLabel: label,
      startDate: new Date(y!, m! - 1, 1),
      endDate: new Date(y!, m!, 0),
    } as never);
    setLabel('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Periods"
        description="Create and process monthly payroll."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payroll', href: '/finance/payroll' },
          { label: 'Periods' },
        ]}
      />

      <div className="flex items-center gap-3 rounded-lg border p-4">
        <input
          className="rounded border px-3 py-1.5 text-sm"
          placeholder="YYYY-MM"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          onClick={handleCreate}
          disabled={createMut.isPending}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Create Period
        </button>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1.2fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Label</span>
          <span>Start</span>
          <span>End</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<LayoutGrid className="h-8 w-8" />} title="No payroll periods yet" />
        ) : (
          <div className="divide-y">
            {items.map((p) => (
              <div key={p.id as string} className="grid grid-cols-[1fr_1fr_1fr_1fr_1.2fr] gap-4 px-4 py-3 text-sm items-center">
                <Link href={`/finance/payroll/periods/${p.id}`} className="font-mono font-medium hover:underline">
                  {p.periodLabel as string}
                </Link>
                <span>{formatDate(p.startDate as string)}</span>
                <span>{formatDate(p.endDate as string)}</span>
                <StatusBadge label={(p.status as string) ?? '-'} variant={getStatusVariant(p.status as string)} dot={false} />
                <div>
                  {(p.status as string) === 'DRAFT' && (
                    <button
                      onClick={() => processMut.mutate({ id: p.id as string } as never)}
                      className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                    >
                      Process
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
