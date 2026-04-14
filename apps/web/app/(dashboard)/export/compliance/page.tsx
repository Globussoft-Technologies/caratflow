'use client';

import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';

export default function ExportCompliancePage() {
  const { data, isLoading } = trpc.export.listComplianceRules.useQuery();
  const rules = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Export Compliance" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Export', href: '/export' },
        { label: 'Compliance' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Rule</span>
          <span>Country</span>
          <span>Severity</span>
          <span>Category</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rules.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No rules</div>
        ) : (
          <div className="divide-y">
            {rules.map((r) => (
              <div key={(r.id as string) ?? (r.name as string)} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{(r.name as string) ?? '-'}</span>
                <span>{(r.country as string) ?? '-'}</span>
                <span>{(r.severity as string) ?? '-'}</span>
                <span>{(r.category as string) ?? '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
