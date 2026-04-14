'use client';

import { PageHeader, EmptyState } from '@caratflow/ui';
import { Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function SeoPage() {
  const { data, isLoading } = trpc.cms.seo.list.useQuery({});
  const d = data as { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | undefined;
  const items = Array.isArray(d) ? d : (d?.items ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="SEO Metadata" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'CMS', href: '/cms' },
        { label: 'SEO' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_2fr_2fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Entity</span>
          <span>Title</span>
          <span>Description</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Search className="h-8 w-8" />} title="No SEO metadata" />
        ) : (
          <div className="divide-y">
            {items.map((s) => (
              <div key={s.id as string} className="grid grid-cols-[1fr_2fr_2fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono text-xs">{(s.entityType as string) ?? '-'}</span>
                <span>{(s.metaTitle as string) ?? '-'}</span>
                <span className="truncate text-muted-foreground">{(s.metaDescription as string) ?? '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
