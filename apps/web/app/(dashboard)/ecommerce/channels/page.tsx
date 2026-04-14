'use client';

import Link from 'next/link';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Globe, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDateTime } from '@/components/format';

export default function ChannelsPage() {
  const { data, isLoading } = trpc.ecommerce.listChannels.useQuery({});
  const items = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Channels" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Channels' },
      ]} actions={
        <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Channel
        </button>
      } />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_1.2fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Type</span>
          <span>Store URL</span>
          <span>Last Sync</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Globe className="h-8 w-8" />} title="No channels" />
        ) : (
          <div className="divide-y">
            {items.map((c) => (
              <Link key={c.id as string} href={`/ecommerce/channels/${c.id}`} className="grid grid-cols-[1.4fr_1fr_1.2fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{(c.name as string) ?? '-'}</span>
                <span>{(c.channelType as string) ?? '-'}</span>
                <span className="truncate text-muted-foreground">{(c.storeUrl as string) ?? '-'}</span>
                <span className="text-muted-foreground">{formatDateTime(c.lastSyncAt)}</span>
                <StatusBadge label={c.isActive ? 'Active' : 'Inactive'} variant={c.isActive ? 'success' : 'default'} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
