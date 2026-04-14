'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';

export default function CustomReportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading } = trpc.reporting.getSavedReport.useQuery({ id }, { enabled: Boolean(id) });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const r: Record<string, unknown> = (data as unknown) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader title={(r.name as string) ?? 'Custom Report'} breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Reports', href: '/reports' },
        { label: 'Custom', href: '/reports/custom' },
        { label: (r.name as string) ?? '' },
      ]} />
      <pre className="rounded-lg border p-4 text-xs overflow-auto">{JSON.stringify(r, null, 2)}</pre>
    </div>
  );
}
