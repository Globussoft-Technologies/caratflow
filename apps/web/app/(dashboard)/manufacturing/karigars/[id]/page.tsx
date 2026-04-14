'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatCard, StatusBadge } from '@caratflow/ui';
import { User, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatMg } from '@/components/format';

export default function KarigarDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading } = trpc.manufacturing.karigar.getById.useQuery({ id }, { enabled: Boolean(id) });
  const { data: balance } = trpc.manufacturing.karigar.getMetalBalance.useQuery({ karigarId: id }, { enabled: Boolean(id) });
  const { data: performance } = trpc.manufacturing.karigar.getPerformance.useQuery({ karigarId: id }, { enabled: Boolean(id) });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const k = data as Record<string, unknown>;
  const bal = (balance as Record<string, unknown> | undefined) ?? {};
  const perf = (performance as Record<string, unknown> | undefined) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${(k.firstName as string) ?? ''} ${(k.lastName as string) ?? ''}`.trim()}
        description={`${k.employeeCode as string} — ${k.skillLevel as string}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Karigars', href: '/manufacturing/karigars' },
          { label: (k.firstName as string) ?? '' },
        ]}
        actions={<StatusBadge label={k.isActive ? 'Active' : 'Inactive'} variant={k.isActive ? 'success' : 'default'} />}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard title="Issued Metal" value={formatMg(bal.issuedMg)} icon={<User className="h-4 w-4" />} />
        <StatCard title="Returned" value={formatMg(bal.returnedMg)} icon={<User className="h-4 w-4" />} />
        <StatCard title="Balance" value={formatMg(bal.balanceMg)} icon={<User className="h-4 w-4" />} />
        <StatCard title="Jobs Completed" value={String((perf.jobsCompleted as number) ?? 0)} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Specialization</span><span>{(k.specialization as string) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{(k.phone as string) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{((k.location as { name?: string })?.name) ?? '-'}</span></div>
      </div>
    </div>
  );
}
