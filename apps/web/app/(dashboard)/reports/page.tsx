'use client';

import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import { BarChart, Package, Factory, Users, TrendingUp, FileText, Clock, Calendar } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function ReportsDashboardPage() {
  const today = new Date();
  const { data } = trpc.reporting.getAnalyticsDashboard.useQuery({
    dateRange: { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today },
  });
  const d = (data as Record<string, unknown> | undefined) ?? {};

  const links = [
    { label: 'Sales Reports', href: '/reports/sales', icon: BarChart },
    { label: 'Inventory Reports', href: '/reports/inventory', icon: Package },
    { label: 'Manufacturing Reports', href: '/reports/manufacturing', icon: Factory },
    { label: 'CRM Reports', href: '/reports/crm', icon: Users },
    { label: 'Forecasting', href: '/reports/forecast', icon: TrendingUp },
    { label: 'Custom Reports', href: '/reports/custom', icon: FileText },
    { label: 'Scheduled Reports', href: '/reports/scheduled', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports' }]} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="MTD Revenue" value={formatPaise(d.mtdRevenuePaise)} icon={<Calendar className="h-4 w-4" />} />
        <StatCard title="MTD Orders" value={String((d.mtdOrders as number) ?? 0)} icon={<BarChart className="h-4 w-4" />} />
        <StatCard title="Stock Value" value={formatPaise(d.stockValuePaise)} icon={<Package className="h-4 w-4" />} />
        <StatCard title="Active Customers" value={String((d.activeCustomers as number) ?? 0)} icon={<Users className="h-4 w-4" />} />
      </div>
      <div className="space-y-2">
        {links.map((l) => (
          <Link key={l.label} href={l.href} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent">
            <div className="flex items-center gap-3"><l.icon className="h-4 w-4" /><span className="text-sm font-medium">{l.label}</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
