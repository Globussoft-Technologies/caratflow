'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate } from '@/components/format';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading } = trpc.manufacturing.job.getById.useQuery({ id }, { enabled: Boolean(id) });
  const { data: cost } = trpc.manufacturing.job.getCost.useQuery({ id }, { enabled: Boolean(id) });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;

  const j = data as Record<string, unknown>;
  const status = j.status as string;

  return (
    <div className="space-y-6">
      <PageHeader
        title={(j.jobNumber as string) ?? 'Job'}
        description={`Status: ${status}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Jobs', href: '/manufacturing/jobs' },
          { label: (j.jobNumber as string) ?? '' },
        ]}
        actions={<StatusBadge label={status} variant={getStatusVariant(status)} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Product</p><p className="text-sm font-medium mt-1">{((j.product as { name?: string })?.name) ?? '-'}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Quantity</p><p className="text-sm font-medium mt-1">{String(j.quantity ?? 0)}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm font-medium mt-1">{formatDate(j.dueDate)}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Karigar</p><p className="text-sm font-medium mt-1">{((j.karigar as { firstName?: string; lastName?: string }) ? `${(j.karigar as { firstName?: string }).firstName ?? ''} ${(j.karigar as { lastName?: string }).lastName ?? ''}`.trim() : '-')}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium mt-1">{((j.location as { name?: string })?.name) ?? '-'}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-sm font-medium mt-1">{formatPaise((cost as Record<string, unknown> | undefined)?.totalCostPaise)}</p></div>
      </div>
    </div>
  );
}
