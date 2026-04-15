'use client';

import { useState } from 'react';
import { PageHeader, EmptyState } from '@caratflow/ui';
import { Calendar } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/components/format';

export default function AttendancePage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [start, end] = (() => {
    const [y, m] = month.split('-').map(Number);
    const s = new Date(y!, m! - 1, 1);
    const e = new Date(y!, m!, 0);
    return [s, e];
  })();

  const { data: rows, isLoading } = trpc.payroll.attendance.list.useQuery({
    startDate: start,
    endDate: end,
  } as never);
  const items = ((rows as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Monthly employee attendance."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payroll', href: '/finance/payroll' },
          { label: 'Attendance' },
        ]}
      />

      <div className="flex items-center gap-3">
        <label className="text-sm">Month:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded border px-3 py-1.5 text-sm"
        />
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Date</span>
          <span>Employee</span>
          <span>Status</span>
          <span>Hours</span>
          <span>Overtime</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Calendar className="h-8 w-8" />} title="No attendance records" />
        ) : (
          <div className="divide-y">
            {items.map((r) => (
              <div key={r.id as string} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{formatDate(r.date as string)}</span>
                <span className="font-mono text-xs">{(r.employeeId as string).slice(0, 8)}</span>
                <span>{r.status as string}</span>
                <span>{r.hoursWorked as number}</span>
                <span>{r.overtimeHours as number}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
