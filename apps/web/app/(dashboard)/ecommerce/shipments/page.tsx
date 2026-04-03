'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Search, Plus, Truck } from 'lucide-react';
import { ShipmentTracker } from '@/features/ecommerce';

// Mock data -- in production from tRPC: ecommerce.listShipments
const shipments = [
  { id: '1', shipmentNumber: 'SH/2604/0012', orderId: 'o1', orderNumber: 'ON/SHO/2604/0028', carrier: 'Bluedart', trackingNumber: 'BD123456789', status: 'LABEL_CREATED', estimatedDeliveryDate: '2026-04-08', shippingCostPaise: 5000_00, createdAt: '2026-04-04T10:00:00Z' },
  { id: '2', shipmentNumber: 'SH/2604/0011', orderId: 'o2', orderNumber: 'ON/AMA/2604/0006', carrier: 'Delhivery', trackingNumber: 'DL987654321', status: 'IN_TRANSIT', estimatedDeliveryDate: '2026-04-07', shippingCostPaise: 7500_00, createdAt: '2026-04-03T14:00:00Z' },
  { id: '3', shipmentNumber: 'SH/2604/0010', orderId: 'o3', orderNumber: 'ON/SHO/2604/0027', carrier: 'Bluedart', trackingNumber: 'BD111222333', status: 'OUT_FOR_DELIVERY', estimatedDeliveryDate: '2026-04-04', shippingCostPaise: 5000_00, createdAt: '2026-04-02T09:00:00Z' },
  { id: '4', shipmentNumber: 'SH/2604/0009', orderId: 'o4', orderNumber: 'ON/SHO/2604/0026', carrier: 'DTDC', trackingNumber: 'DT444555666', status: 'DELIVERED', estimatedDeliveryDate: '2026-04-03', shippingCostPaise: 4500_00, createdAt: '2026-04-01T10:00:00Z' },
];

const shipmentStatusColors: Record<string, string> = {
  LABEL_CREATED: 'secondary',
  PICKED_UP: 'warning',
  IN_TRANSIT: 'info',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  RETURNED: 'destructive',
};

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

export default function ShipmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Track and manage shipments for online orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Shipments' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Create Shipment
          </button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by shipment number or tracking number..."
          className="h-10 w-full rounded-md border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Shipment</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Order</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Carrier</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Tracking</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">ETA</th>
              <th className="p-3 text-right text-xs font-medium text-muted-foreground uppercase">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shipments.map((sh) => (
              <tr key={sh.id} className="transition-colors hover:bg-accent/50">
                <td className="p-3">
                  <span className="text-sm font-medium font-mono">{sh.shipmentNumber}</span>
                </td>
                <td className="p-3">
                  <a href={`/ecommerce/orders/${sh.orderId}`} className="text-sm font-mono text-primary hover:underline">
                    {sh.orderNumber}
                  </a>
                </td>
                <td className="p-3">
                  <span className="text-sm">{sh.carrier}</span>
                </td>
                <td className="p-3">
                  <span className="text-xs font-mono text-muted-foreground">{sh.trackingNumber}</span>
                </td>
                <td className="p-3">
                  <StatusBadge
                    label={sh.status.replace(/_/g, ' ')}
                    variant={getStatusVariant(sh.status)}
                    dot={false}
                  />
                </td>
                <td className="p-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(sh.estimatedDeliveryDate).toLocaleDateString()}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className="text-sm">{formatPaise(sh.shippingCostPaise)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
