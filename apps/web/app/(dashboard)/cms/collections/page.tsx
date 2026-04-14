'use client';

import Link from 'next/link';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Grid3x3, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function CollectionsPage() {
  const { data, isLoading } = trpc.cms.collections.list.useQuery({});
  const items = ((data as Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> } | undefined));
  const rows = Array.isArray(items) ? items : (items?.items ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Collections" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'CMS', href: '/cms' },
        { label: 'Collections' },
      ]} actions={
        <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Collection
        </button>
      } />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Slug</span>
          <span>Products</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Grid3x3 className="h-8 w-8" />} title="No collections" />
        ) : (
          <div className="divide-y">
            {rows.map((c) => (
              <Link key={c.id as string} href={`/cms/collections/${c.id}`} className="grid grid-cols-[2fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{(c.name as string) ?? '-'}</span>
                <span className="font-mono text-xs text-muted-foreground">{(c.slug as string) ?? '-'}</span>
                <span>{String((c.productIds as unknown[] | undefined)?.length ?? c.productCount ?? 0)}</span>
                <StatusBadge label={c.isActive ? 'Active' : 'Inactive'} variant={c.isActive ? 'success' : 'default'} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
