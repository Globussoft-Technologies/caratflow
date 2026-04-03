'use client';

import { useParams } from 'next/navigation';
import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { MovementTimeline } from '@/features/inventory/movement-timeline';
import type { ColumnDef } from '@caratflow/ui';

export default function StockItemDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: item, isLoading } = trpc.inventory.stockItems.getById.useQuery({ id });

  const { data: movements } = trpc.inventory.movements.list.useQuery({
    stockItemId: id,
    page: 1,
    limit: 20,
  });

  const { data: serials } = trpc.inventory.serialNumbers.list.useQuery({
    productId: item?.productId ?? '',
    page: 1,
    limit: 50,
  }, { enabled: !!item?.productId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!item) {
    return <div className="text-center text-muted-foreground py-12">Stock item not found.</div>;
  }

  const available = item.quantityOnHand - item.quantityReserved;

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.product?.name ?? 'Stock Item'}
        description={`SKU: ${item.product?.sku ?? '-'} | Location: ${item.location?.name ?? '-'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Items', href: '/inventory/items' },
          { label: item.product?.name ?? id },
        ]}
      />

      {/* Stock Level Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">On Hand</div>
          <div className="text-2xl font-bold">{item.quantityOnHand}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Reserved</div>
          <div className="text-2xl font-bold">{item.quantityReserved}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Available</div>
          <div className={`text-2xl font-bold ${available <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {available}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">On Order</div>
          <div className="text-2xl font-bold">{item.quantityOnOrder}</div>
        </div>
      </div>

      {/* Item Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-sm">Stock Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Reorder Level:</span>
            <span>{item.reorderLevel}</span>
            <span className="text-muted-foreground">Reorder Quantity:</span>
            <span>{item.reorderQuantity}</span>
            <span className="text-muted-foreground">Bin Location:</span>
            <span>{item.binLocation ?? '-'}</span>
            <span className="text-muted-foreground">Last Counted:</span>
            <span>{item.lastCountedAt ? new Date(item.lastCountedAt).toLocaleDateString() : 'Never'}</span>
          </div>
        </div>
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-sm">Product Info</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Type:</span>
            <span>{item.product?.productType ?? '-'}</span>
            <span className="text-muted-foreground">Cost Price:</span>
            <span>
              {item.product?.costPricePaise
                ? (Number(item.product.costPricePaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                : '-'}
            </span>
            <span className="text-muted-foreground">Selling Price:</span>
            <span>
              {item.product?.sellingPricePaise
                ? (Number(item.product.sellingPricePaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                : '-'}
            </span>
            <span className="text-muted-foreground">Total Value:</span>
            <span className="font-semibold">
              {item.product?.costPricePaise
                ? ((Number(item.product.costPricePaise) * item.quantityOnHand) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Movement History */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Movement History</h3>
        <MovementTimeline movements={(movements?.items ?? []) as Array<{
          id: string;
          movementType: string;
          quantityChange: number;
          movedAt: string;
          notes: string | null;
          referenceType: string | null;
        }>} />
      </div>

      {/* Serial Numbers */}
      {serials && serials.items.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Serial Numbers</h3>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Serial</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Status</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">RFID</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Location</th>
                </tr>
              </thead>
              <tbody>
                {(serials.items as Array<{
                  id: string;
                  serialNumber: string;
                  status: string;
                  rfidTag: string | null;
                  location?: { name: string } | null;
                }>).map((serial) => (
                  <tr key={serial.id} className="border-b">
                    <td className="px-4 py-2 font-mono">{serial.serialNumber}</td>
                    <td className="px-4 py-2">
                      <StatusBadge label={serial.status} variant={getStatusVariant(serial.status)} />
                    </td>
                    <td className="px-4 py-2">{serial.rfidTag ?? '-'}</td>
                    <td className="px-4 py-2">{serial.location?.name ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
