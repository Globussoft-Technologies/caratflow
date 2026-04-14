'use client';

import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Image as ImageIcon, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function BannersPage() {
  const { data, isLoading } = trpc.cms.banners.list.useQuery({});
  const items = ((data as Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> } | undefined));
  const rows = Array.isArray(items) ? items : (items?.items ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Banners" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'CMS', href: '/cms' },
        { label: 'Banners' },
      ]} actions={
        <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Banner
        </button>
      } />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Title</span>
          <span>Placement</span>
          <span>Sort</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ImageIcon className="h-8 w-8" />} title="No banners" />
        ) : (
          <div className="divide-y">
            {rows.map((b) => (
              <div key={b.id as string} className="grid grid-cols-[2fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(b.title as string) ?? '-'}</span>
                <span>{(b.placement as string) ?? '-'}</span>
                <span>{String(b.sortOrder ?? 0)}</span>
                <StatusBadge label={b.isActive ? 'Active' : 'Inactive'} variant={b.isActive ? 'success' : 'default'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
