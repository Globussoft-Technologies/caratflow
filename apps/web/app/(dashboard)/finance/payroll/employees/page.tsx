'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Users, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';

export default function EmployeesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.payroll.employees.list.useQuery({ page, limit: 20 } as never);
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Staff roster for payroll."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payroll', href: '/finance/payroll' },
          { label: 'Employees' },
        ]}
        actions={
          <Link href="/finance/payroll/employees/new" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Employee
          </Link>
        }
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[0.8fr_1.4fr_1fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Code</span>
          <span>Name</span>
          <span>Designation</span>
          <span>Department</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />} title="No employees yet" />
        ) : (
          <div className="divide-y">
            {items.map((e) => (
              <Link key={e.id as string} href={`/finance/payroll/employees/${e.id}`} className="grid grid-cols-[0.8fr_1.4fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-mono font-medium">{(e.employeeCode as string) ?? '-'}</span>
                <span>{`${(e.firstName as string) ?? ''} ${(e.lastName as string) ?? ''}`.trim()}</span>
                <span className="text-muted-foreground">{(e.designation as string) ?? '-'}</span>
                <span className="text-muted-foreground">{(e.department as string) ?? '-'}</span>
                <StatusBadge label={(e.status as string) ?? '-'} variant={getStatusVariant(e.status as string)} dot={false} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {d && d.totalPages && d.totalPages > 0 && (
        <PaginationControls page={d.page ?? 1} totalPages={d.totalPages} hasPrevious={d.hasPrevious ?? false} hasNext={d.hasNext ?? false} onChange={setPage} />
      )}
    </div>
  );
}
