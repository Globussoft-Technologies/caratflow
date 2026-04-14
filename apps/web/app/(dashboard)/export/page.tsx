'use client';

import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import { Ship, FileText, Package, Globe, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function ExportDashboardPage() {
  const { data } = trpc.export.getDashboard.useQuery();
  const d = (data as Record<string, unknown> | undefined) ?? {};

  const links = [
    { label: 'Export Orders', href: '/export/orders', icon: Ship },
    { label: 'Invoices', href: '/export/invoices', icon: FileText },
    { label: 'Documents', href: '/export/documents', icon: Package },
    { label: 'Compliance', href: '/export/compliance', icon: Globe },
    { label: 'Duty & HS Codes', href: '/export/duty', icon: FileText },
    { label: 'Licenses', href: '/export/licenses', icon: FileText },
    { label: 'Exchange Rates', href: '/export/exchange-rates', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Export & International Trade" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Export' }]} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Orders" value={String((d.activeOrders as number) ?? 0)} icon={<Ship className="h-4 w-4" />} />
        <StatCard title="Pending Docs" value={String((d.pendingDocs as number) ?? 0)} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="MTD Export Value" value={formatPaise(d.mtdValuePaise)} icon={<Globe className="h-4 w-4" />} />
        <StatCard title="Licenses" value={String((d.activeLicenses as number) ?? 0)} icon={<FileText className="h-4 w-4" />} />
      </div>
      <div className="space-y-2">
        {links.map((l) => (
          <Link key={l.label} href={l.href} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent">
            <div className="flex items-center gap-3"><l.icon className="h-4 w-4" /><span className="text-sm font-medium">{l.label}</span></div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
