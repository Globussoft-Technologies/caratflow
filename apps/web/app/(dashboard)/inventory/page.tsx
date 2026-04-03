'use client';

import { PageHeader, StatCard, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Package, ArrowLeftRight, ClipboardCheck, AlertTriangle, Plus, ArrowRightLeft, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import type { ColumnDef } from '@caratflow/ui';

export default function InventoryDashboardPage() {
  const { data: dashboard, isLoading } = trpc.inventory.dashboard.get.useQuery();

  const movementColumns: ColumnDef<{
    id: string;
    movementType: string;
    quantityChange: number;
    movedAt: string;
    notes: string | null;
    stockItem?: {
      product?: { sku: string; name: string };
      location?: { name: string };
    };
  }, unknown>[] = [
    {
      accessorKey: 'stockItem.product.sku',
      header: 'SKU',
      cell: ({ row }) => row.original.stockItem?.product?.sku ?? '-',
    },
    {
      accessorKey: 'stockItem.product.name',
      header: 'Product',
      cell: ({ row }) => row.original.stockItem?.product?.name ?? '-',
    },
    {
      accessorKey: 'movementType',
      header: 'Type',
      cell: ({ row }) => (
        <StatusBadge label={row.original.movementType} variant={getStatusVariant(row.original.movementType)} />
      ),
    },
    {
      accessorKey: 'quantityChange',
      header: 'Qty Change',
      cell: ({ row }) => {
        const val = row.original.quantityChange;
        return (
          <span className={val > 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
            {val > 0 ? `+${val}` : val}
          </span>
        );
      },
    },
    {
      accessorKey: 'stockItem.location.name',
      header: 'Location',
      cell: ({ row }) => row.original.stockItem?.location?.name ?? '-',
    },
    {
      accessorKey: 'movedAt',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.movedAt).toLocaleDateString(),
    },
  ];

  const totalValue = dashboard?.totalStockValuePaise
    ? `${(Number(dashboard.totalStockValuePaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`
    : '---';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Track stock across all locations and manage transfers."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inventory' }]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/inventory/items"
              className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              <Search className="h-4 w-4" />
              Browse Items
            </Link>
            <Link
              href="/inventory/transfers"
              className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Transfer
            </Link>
            <Link
              href="/inventory/stock-takes"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <ClipboardCheck className="h-4 w-4" />
              Stock Take
            </Link>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Stock Value"
          value={totalValue}
          icon={<Package className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Total SKUs"
          value={dashboard?.totalSKUs?.toString() ?? '0'}
          icon={<Package className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Low Stock Alerts"
          value={dashboard?.lowStockAlerts?.length?.toString() ?? '0'}
          icon={<AlertTriangle className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Transfers"
          value={dashboard?.pendingTransfers?.toString() ?? '0'}
          icon={<ArrowLeftRight className="h-5 w-5" />}
          isLoading={isLoading}
        />
      </div>

      {/* Low Stock Alerts */}
      {dashboard?.lowStockAlerts && dashboard.lowStockAlerts.length > 0 && (
        <div className="rounded-lg border bg-amber-50 p-4 dark:bg-amber-950">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Low Stock Alerts ({dashboard.lowStockAlerts.length})
          </h3>
          <div className="mt-2 space-y-1">
            {dashboard.lowStockAlerts.slice(0, 5).map((alert) => (
              <div key={alert.stockItemId} className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-300">
                <span>{alert.productName} ({alert.sku}) - {alert.locationName}</span>
                <span className="font-medium">
                  {alert.quantityOnHand} / {alert.reorderLevel} min
                </span>
              </div>
            ))}
            {dashboard.lowStockAlerts.length > 5 && (
              <Link href="/inventory/items?lowStock=true" className="text-sm text-amber-600 underline">
                View all {dashboard.lowStockAlerts.length} alerts
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Metal Breakdown */}
      {dashboard?.metalBreakdown && dashboard.metalBreakdown.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Metal Stock Summary</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {dashboard.metalBreakdown.map((metal, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{metal.metalType} ({metal.purityFineness})</div>
                <div className="text-lg font-bold">
                  {(Number(metal.totalWeightMg) / 1000).toFixed(2)}g
                </div>
                <div className="text-xs text-muted-foreground">
                  {(Number(metal.totalValuePaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Movements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Movements</h3>
          <Link href="/inventory/movements" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <DataTable
          columns={movementColumns}
          data={dashboard?.recentMovements ?? []}
          isLoading={isLoading}
          pageSize={10}
        />
      </div>
    </div>
  );
}
