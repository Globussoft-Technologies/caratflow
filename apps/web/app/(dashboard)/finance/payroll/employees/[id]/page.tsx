'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = trpc.payroll.employees.get.useQuery(
    { id: params.id! },
    { enabled: !!params.id },
  );
  const e = data as Record<string, unknown> | undefined;

  if (isLoading || !e) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${(e.firstName as string) ?? ''} ${(e.lastName as string) ?? ''}`.trim()}
        description={(e.employeeCode as string) ?? ''}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payroll', href: '/finance/payroll' },
          { label: 'Employees', href: '/finance/payroll/employees' },
          { label: (e.employeeCode as string) ?? 'Detail' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-5 space-y-3">
          <h3 className="text-sm font-semibold">Profile</h3>
          <div className="text-sm text-muted-foreground">Designation: {(e.designation as string) ?? '-'}</div>
          <div className="text-sm text-muted-foreground">Department: {(e.department as string) ?? '-'}</div>
          <div className="text-sm text-muted-foreground">Status: <StatusBadge label={(e.status as string) ?? '-'} variant={getStatusVariant(e.status as string)} dot={false} /></div>
          <div className="text-sm text-muted-foreground">PAN: {(e.panNumber as string) ?? '-'}</div>
          <div className="text-sm text-muted-foreground">Aadhaar: {(e.aadhaarNumber as string) ?? '-'}</div>
        </div>
        <div className="rounded-lg border p-5 space-y-3">
          <h3 className="text-sm font-semibold">Salary Components</h3>
          <div className="text-sm">Basic: <span className="font-semibold">{formatPaise(e.basicSalaryPaise)}</span></div>
          <div className="text-sm">HRA: <span className="font-semibold">{formatPaise(e.hraPaise)}</span></div>
          <div className="text-sm">DA: <span className="font-semibold">{formatPaise(e.daPaise)}</span></div>
          <div className="text-sm">Conveyance: <span className="font-semibold">{formatPaise(e.conveyancePaise)}</span></div>
          <div className="text-sm">Medical: <span className="font-semibold">{formatPaise(e.medicalPaise)}</span></div>
          <div className="text-sm">Other: <span className="font-semibold">{formatPaise(e.otherAllowancePaise)}</span></div>
        </div>
        <div className="rounded-lg border p-5 space-y-3 lg:col-span-2">
          <h3 className="text-sm font-semibold">Bank Details</h3>
          <div className="text-sm text-muted-foreground">Account: {(e.bankAccountNumber as string) ?? '-'}</div>
          <div className="text-sm text-muted-foreground">IFSC: {(e.bankIfsc as string) ?? '-'}</div>
          <div className="text-sm text-muted-foreground">Bank: {(e.bankName as string) ?? '-'}</div>
        </div>
      </div>
    </div>
  );
}
