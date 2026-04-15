'use client';

import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import { Users, Calendar, FileText, Landmark, ArrowRight, LayoutGrid } from 'lucide-react';

export default function PayrollDashboardPage() {
  const links = [
    { label: 'Employees', href: '/finance/payroll/employees', icon: Users, description: 'Staff roster, salary details, bulk import.' },
    { label: 'Attendance', href: '/finance/payroll/attendance', icon: Calendar, description: 'Daily and monthly attendance marking.' },
    { label: 'Payroll Periods', href: '/finance/payroll/periods', icon: LayoutGrid, description: 'Process monthly payroll and approve payslips.' },
    { label: 'Salary Structures', href: '/finance/payroll/salary-structures', icon: FileText, description: 'Define salary templates for designations.' },
    { label: 'Bank File', href: '/finance/payroll/bank-file', icon: Landmark, description: 'Generate NEFT bank transfer CSV.' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Employee payroll, attendance, and statutory compliance."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payroll' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-start gap-4 rounded-lg border p-5 hover:bg-accent"
          >
            <l.icon className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <div className="flex items-center gap-1 text-sm font-semibold">
                {l.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{l.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
