'use client';

import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import { Factory, Hammer, Users, Shield, FileText, LayoutList, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function ManufacturingDashboardPage() {
  const { data } = trpc.manufacturing.dashboard.useQuery();
  const d = (data as Record<string, unknown> | undefined) ?? {};

  const quickLinks = [
    { label: 'Job Orders', href: '/manufacturing/jobs', icon: Hammer },
    { label: 'BOMs', href: '/manufacturing/bom', icon: FileText },
    { label: 'Karigars', href: '/manufacturing/karigars', icon: Users },
    { label: 'QC', href: '/manufacturing/qc', icon: Shield },
    { label: 'Production Planning', href: '/manufacturing/planning', icon: LayoutList },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing"
        description="Production orders, karigars, BOMs and QC."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Manufacturing' }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Jobs" value={String((d.activeJobs as number) ?? 0)} icon={<Hammer className="h-4 w-4" />} />
        <StatCard title="Karigars" value={String((d.totalKarigars as number) ?? 0)} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Pending QC" value={String((d.pendingQc as number) ?? 0)} icon={<Shield className="h-4 w-4" />} />
        <StatCard title="Completed (30d)" value={String((d.completedJobs30d as number) ?? 0)} icon={<Factory className="h-4 w-4" />} />
      </div>

      <div className="space-y-2">
        {quickLinks.map((l) => (
          <Link key={l.label} href={l.href} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent">
            <div className="flex items-center gap-3">
              <l.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{l.label}</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
