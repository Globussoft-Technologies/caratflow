'use client';

import { PageHeader, EmptyState, StatusBadge } from '@caratflow/ui';
import { Shield } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/components/format';

export default function QcPage() {
  const { data: pending, isLoading } = trpc.manufacturing.qc.getPendingJobs.useQuery();
  const { data: recent } = trpc.manufacturing.qc.getRecentResults.useQuery({ limit: 20 });
  const pendingJobs = ((pending as Array<Record<string, unknown>> | undefined) ?? []);
  const recentResults = ((recent as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        description="Review jobs pending QC and recent checkpoint results."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'QC' },
        ]}
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pending QC</h2>
        <div className="rounded-lg border">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
          ) : pendingJobs.length === 0 ? (
            <EmptyState icon={<Shield className="h-8 w-8" />} title="No jobs pending QC" />
          ) : (
            <div className="divide-y">
              {pendingJobs.map((j) => (
                <div key={j.id as string} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-mono font-medium">{(j.jobNumber as string) ?? '-'}</span>
                  <span>{((j.product as { name?: string })?.name) ?? '-'}</span>
                  <span className="text-muted-foreground">{formatDate(j.updatedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent QC Results</h2>
        <div className="rounded-lg border divide-y">
          {recentResults.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No recent results</div>
          ) : (
            recentResults.map((r) => (
              <div key={r.id as string} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-mono">{(r.jobNumber as string) ?? '-'}</span>
                <StatusBadge label={(r.result as string) ?? '-'} variant="default" />
                <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
