'use client';

import { PageHeader, EmptyState } from '@caratflow/ui';
import { FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/components/format';

export default function SalaryStructuresPage() {
  const { data, isLoading } = trpc.payroll.salaryStructures.list.useQuery();
  const items = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Structures"
        description="Templates for salary component breakdowns."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payroll', href: '/finance/payroll' },
          { label: 'Salary Structures' },
        ]}
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Basic %</span>
          <span>HRA %</span>
          <span>DA %</span>
          <span>Effective From</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="No salary structures defined" />
        ) : (
          <div className="divide-y">
            {items.map((s) => (
              <div key={s.id as string} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{s.name as string}</span>
                <span>{s.basicPercent as number}%</span>
                <span>{s.hraPercent as number}%</span>
                <span>{s.daPercent as number}%</span>
                <span>{formatDate(s.effectiveFrom as string)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
