'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate } from '@/components/format';

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data, isLoading } = trpc.wholesale.getSupplier.useQuery(
    { id },
    { enabled: Boolean(id) },
  );
  const { data: performance } = trpc.wholesale.getSupplierPerformance.useQuery(
    { id },
    { enabled: Boolean(id) },
  );
  const { data: purchaseOrdersData } = trpc.wholesale.listPurchaseOrders.useQuery(
    {
      filters: { supplierId: id },
      pagination: { page: 1, limit: 10, sortOrder: 'desc' },
    },
    { enabled: Boolean(id) },
  );

  if (isLoading || !data) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  }

  const s = data as Record<string, unknown>;
  const perf = (performance as Record<string, unknown> | undefined) ?? null;
  const purchaseOrders = ((purchaseOrdersData?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.name as string}
        description={(s.supplierType as string) ?? 'Supplier'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Suppliers', href: '/wholesale/suppliers' },
          { label: s.name as string },
        ]}
        actions={
          <StatusBadge
            label={s.isActive ? 'Active' : 'Inactive'}
            variant={s.isActive ? 'success' : 'default'}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Contact</p>
          <p className="mt-1 text-sm font-medium">{(s.contactPerson as string) ?? '-'}</p>
          <p className="text-sm text-muted-foreground">{(s.phone as string) ?? '-'}</p>
          <p className="text-sm text-muted-foreground">{(s.email as string) ?? '-'}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Address</p>
          <p className="mt-1 text-sm">{(s.address as string) ?? '-'}</p>
          <p className="text-sm text-muted-foreground">
            {[s.city, s.state, s.country].filter(Boolean).join(', ') || '-'}
          </p>
          <p className="text-sm text-muted-foreground">{(s.postalCode as string) ?? ''}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Tax IDs</p>
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">GSTIN: </span>
            <span className="font-mono">{(s.gstinNumber as string) ?? '-'}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">PAN: </span>
            <span className="font-mono">{(s.panNumber as string) ?? '-'}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Rating: </span>
            {String(s.rating ?? '-')}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Performance
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase text-muted-foreground">Total Orders</p>
            <p className="mt-2 text-2xl font-semibold">{Number(perf?.totalOrders ?? 0)}</p>
            <p className="text-xs text-muted-foreground">
              {Number(perf?.completedOrders ?? 0)} completed
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase text-muted-foreground">On-time Delivery</p>
            <p className="mt-2 text-2xl font-semibold">
              {Number(perf?.onTimeDeliveryPercent ?? 0)}%
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase text-muted-foreground">Quality Rejection</p>
            <p className="mt-2 text-2xl font-semibold">
              {Number(perf?.qualityRejectionPercent ?? 0)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Avg lead: {Number(perf?.averageLeadTimeDays ?? 0)} days
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase text-muted-foreground">Total Purchase Value</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatPaise(perf?.totalPurchaseValuePaise)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Purchase Orders
        </h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>PO Number</span>
            <span>Status</span>
            <span>Total</span>
            <span>Expected</span>
            <span>Created</span>
          </div>
          {purchaseOrders.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No purchase orders yet.
            </div>
          ) : (
            <div className="divide-y">
              {purchaseOrders.map((po) => (
                <Link
                  key={po.id as string}
                  href={`/wholesale/purchase-orders/${po.id}`}
                  className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm hover:bg-accent"
                >
                  <span className="font-mono text-xs">{(po.poNumber as string) ?? '-'}</span>
                  <span>{po.status as string}</span>
                  <span className="font-semibold">{formatPaise(po.totalPaise)}</span>
                  <span className="text-muted-foreground">
                    {po.expectedDate ? formatDate(po.expectedDate) : '-'}
                  </span>
                  <span className="text-muted-foreground">{formatDate(po.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
