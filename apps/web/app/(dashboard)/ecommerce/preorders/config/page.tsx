'use client';

import { PageHeader, EmptyState } from '@caratflow/ui';
import { Settings } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function PreorderConfigPage() {
  const { data, isLoading } = trpc.preorder.listConfigs.useQuery({} as never);
  const items = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Pre-Order Configuration" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Pre-Orders', href: '/ecommerce/preorders' },
        { label: 'Config' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Product</span>
          <span>Max Qty</span>
          <span>Deposit %</span>
          <span>Active</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Settings className="h-8 w-8" />} title="No configurations" />
        ) : (
          <div className="divide-y">
            {items.map((c) => (
              <div key={c.id as string} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{(((c.product as { name?: string })?.name)) ?? '-'}</span>
                <span>{String(c.maxQuantity ?? '-')}</span>
                <span>{String(c.depositPercent ?? '-')}%</span>
                <span>{c.isActive ? 'Yes' : 'No'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
