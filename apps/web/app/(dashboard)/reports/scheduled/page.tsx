'use client';

import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Clock } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function ScheduledReportsPage() {
  const { data, isLoading, refetch } = trpc.reporting.listScheduledReports.useQuery();
  const toggle = trpc.reporting.toggleScheduledReport.useMutation({ onSuccess: () => refetch() });
  const items = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Scheduled Reports" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Reports', href: '/reports' },
        { label: 'Scheduled' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Report</span>
          <span>Frequency</span>
          <span>Time</span>
          <span>Format</span>
          <span>Active</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Clock className="h-8 w-8" />} title="No scheduled reports" />
        ) : (
          <div className="divide-y">
            {items.map((s) => {
              const sr = s.savedReport as { name?: string } | undefined;
              return (
                <div key={s.id as string} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span className="font-medium">{sr?.name ?? '-'}</span>
                  <span>{(s.frequency as string) ?? '-'}</span>
                  <span>{(s.timeOfDay as string) ?? '-'}</span>
                  <span>{(s.format as string) ?? '-'}</span>
                  <button onClick={() => toggle.mutate({ id: s.id as string, isActive: !s.isActive })}>
                    <StatusBadge label={s.isActive ? 'Active' : 'Paused'} variant={s.isActive ? 'success' : 'default'} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
