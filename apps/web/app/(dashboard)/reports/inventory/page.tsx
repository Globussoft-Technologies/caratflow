'use client';

import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function InventoryReportsPage() {
  const { data: summary } = trpc.reporting.stockSummary.useQuery({});
  const { data: lowStock } = trpc.reporting.lowStockAlert.useQuery();
  const s = (summary as Record<string, unknown> | undefined) ?? {};
  const low = ((lowStock as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Reports" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Reports', href: '/reports' },
        { label: 'Inventory' },
      ]} />
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Total Items</span><span>{String(s.totalItems ?? 0)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total Value</span><span className="font-semibold">{formatPaise(s.totalValuePaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Low Stock Items</span><span>{String(s.lowStockCount ?? 0)}</span></div>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Low Stock Alerts</h2>
        <div className="rounded-lg border divide-y">
          {low.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No low-stock items</div>
          ) : (
            low.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{((p.product as { name?: string })?.name) ?? (p.name as string) ?? '-'}</span>
                <span className="font-mono text-xs text-muted-foreground">{String(p.quantityOnHand ?? 0)} / {String(p.reorderLevel ?? 0)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
