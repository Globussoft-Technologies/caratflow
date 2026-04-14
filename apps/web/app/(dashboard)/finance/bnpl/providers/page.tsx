'use client';

import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Users } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function BnplProvidersPage() {
  const { data, isLoading } = trpc.bnpl.listProviders.useQuery();
  const items = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="BNPL Providers" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'BNPL', href: '/finance/bnpl' },
        { label: 'Providers' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Provider</span>
          <span>Type</span>
          <span>Merchant ID</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />} title="No providers" />
        ) : (
          <div className="divide-y">
            {items.map((p) => (
              <div key={p.id as string} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(p.name as string) ?? '-'}</span>
                <span>{(p.providerType as string) ?? '-'}</span>
                <span className="font-mono text-xs">{(p.merchantId as string) ?? '-'}</span>
                <StatusBadge label={p.isActive ? 'Active' : 'Inactive'} variant={p.isActive ? 'success' : 'default'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
