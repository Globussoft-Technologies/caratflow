'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';

export default function GoldSavingsDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading } = trpc.india.schemes.goldSavings.getById.useQuery({ id }, { enabled: Boolean(id) });
  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const s = data as Record<string, unknown>;
  return (
    <div className="space-y-6">
      <PageHeader title={(s.name as string) ?? 'Gold Savings Scheme'} breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'Schemes', href: '/finance/schemes' },
        { label: 'Gold Savings', href: '/finance/schemes/gold-savings' },
        { label: (s.name as string) ?? '' },
      ]} />
      <pre className="rounded-lg border p-4 text-xs overflow-auto">{JSON.stringify(s, null, 2)}</pre>
    </div>
  );
}
