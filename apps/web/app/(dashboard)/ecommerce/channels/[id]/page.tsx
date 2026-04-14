'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatDateTime } from '@/components/format';

export default function ChannelDetailPage() {
  const params = useParams<{ id: string }>();
  const channelId = params?.id ?? '';
  const { data, isLoading } = trpc.ecommerce.getChannel.useQuery({ channelId }, { enabled: Boolean(channelId) });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const c: Record<string, unknown> = (data as unknown) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader title={(c.name as string) ?? 'Channel'} breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Channels', href: '/ecommerce/channels' },
        { label: (c.name as string) ?? '' },
      ]} actions={<StatusBadge label={c.isActive ? 'Active' : 'Inactive'} variant={c.isActive ? 'success' : 'default'} />} />
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{(c.channelType as string) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Store URL</span><span>{(c.storeUrl as string) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Last Sync</span><span>{formatDateTime(c.lastSyncAt)}</span></div>
      </div>
    </div>
  );
}
