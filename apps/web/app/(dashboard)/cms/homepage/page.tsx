'use client';

import { PageHeader, EmptyState } from '@caratflow/ui';
import { Home } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function HomepageCmsPage() {
  const { data, isLoading } = trpc.cms.homepage.list.useQuery();
  const items = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Homepage Sections" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'CMS', href: '/cms' },
        { label: 'Homepage' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Section</span>
          <span>Type</span>
          <span>Sort</span>
          <span>Active</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Home className="h-8 w-8" />} title="No sections" />
        ) : (
          <div className="divide-y">
            {items.map((s) => (
              <div key={s.id as string} className="grid grid-cols-[2fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(s.name as string) ?? (s.title as string) ?? '-'}</span>
                <span>{(s.sectionType as string) ?? '-'}</span>
                <span>{String(s.sortOrder ?? 0)}</span>
                <span>{s.isActive ? 'Yes' : 'No'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
