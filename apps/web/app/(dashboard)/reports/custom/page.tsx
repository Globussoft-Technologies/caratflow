'use client';

import Link from 'next/link';
import { PageHeader, EmptyState } from '@caratflow/ui';
import { FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/components/format';

export default function CustomReportsPage() {
  const { data, isLoading } = trpc.reporting.listSavedReports.useQuery({});
  const items = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Saved Reports" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Reports', href: '/reports' },
        { label: 'Custom' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Type</span>
          <span>Default</span>
          <span>Updated</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="No saved reports" />
        ) : (
          <div className="divide-y">
            {items.map((r) => (
              <Link key={r.id as string} href={`/reports/custom/${r.id}`} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{(r.name as string) ?? '-'}</span>
                <span>{(r.reportType as string) ?? '-'}</span>
                <span>{r.isDefault ? 'Yes' : ''}</span>
                <span className="text-muted-foreground">{formatDate(r.updatedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
