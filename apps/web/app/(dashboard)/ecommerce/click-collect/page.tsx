'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { MapPin, Bell, CheckCircle2, X } from 'lucide-react';
import { ClickCollectQueue } from '@/features/ecommerce';

// Mock data -- in production from tRPC: ecommerce.listClickCollects
const clickCollectItems = [
  { id: '1', orderId: 'o1', orderNumber: 'ON/SHO/2604/0028', customerName: 'Meera Joshi', customerPhone: '+91 98765 43210', locationName: 'Mumbai Showroom', status: 'READY_FOR_PICKUP', readyAt: '2026-04-04T10:00:00Z', expiresAt: '2026-04-11T10:00:00Z', itemCount: 2, totalPaise: 128750_00 },
  { id: '2', orderId: 'o2', orderNumber: 'ON/SHO/2604/0025', customerName: 'Riya Sharma', customerPhone: '+91 87654 32109', locationName: 'Mumbai Showroom', status: 'NOTIFIED', readyAt: '2026-04-03T14:00:00Z', notifiedAt: '2026-04-03T14:30:00Z', expiresAt: '2026-04-10T14:00:00Z', itemCount: 1, totalPaise: 85000_00 },
  { id: '3', orderId: 'o3', orderNumber: 'ON/SHO/2604/0022', customerName: 'Vikram Singh', customerPhone: '+91 76543 21098', locationName: 'Delhi Showroom', status: 'PICKED_UP', readyAt: '2026-04-01T09:00:00Z', pickedUpAt: '2026-04-02T11:00:00Z', itemCount: 3, totalPaise: 250000_00 },
];

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

const statusConfig: Record<string, { icon: typeof MapPin; label: string; color: string }> = {
  READY_FOR_PICKUP: { icon: MapPin, label: 'Ready for Pickup', color: 'info' },
  NOTIFIED: { icon: Bell, label: 'Customer Notified', color: 'warning' },
  PICKED_UP: { icon: CheckCircle2, label: 'Picked Up', color: 'success' },
  CANCELLED: { icon: X, label: 'Cancelled', color: 'destructive' },
};

export default function ClickCollectPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Click & Collect"
        description="Buy online, pick up in store. Manage collection queue by location."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Click & Collect' },
        ]}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">
            {clickCollectItems.filter((i) => i.status === 'READY_FOR_PICKUP').length}
          </p>
          <p className="text-xs text-muted-foreground">Ready for Pickup</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">
            {clickCollectItems.filter((i) => i.status === 'NOTIFIED').length}
          </p>
          <p className="text-xs text-muted-foreground">Notified</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">
            {clickCollectItems.filter((i) => i.status === 'PICKED_UP').length}
          </p>
          <p className="text-xs text-muted-foreground">Picked Up Today</p>
        </div>
      </div>

      {/* Queue */}
      <div className="space-y-3">
        {clickCollectItems.map((item) => {
          const config = statusConfig[item.status] ?? statusConfig.READY_FOR_PICKUP;
          const StatusIcon = config.icon;

          return (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/ecommerce/orders/${item.orderId}`}
                      className="text-sm font-medium font-mono hover:underline"
                    >
                      {item.orderNumber}
                    </a>
                    <StatusBadge
                      label={config.label}
                      variant={getStatusVariant(item.status)}
                      dot
                    />
                  </div>
                  <p className="text-sm">{item.customerName}</p>
                  <p className="text-xs text-muted-foreground">{item.customerPhone}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-semibold">{formatPaise(item.totalPaise)}</p>
                  <p className="text-xs text-muted-foreground">{item.itemCount} item(s)</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{item.locationName}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'READY_FOR_PICKUP' && (
                    <button className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors hover:bg-accent">
                      <Bell className="h-3 w-3" />
                      Notify Customer
                    </button>
                  )}
                  {(item.status === 'READY_FOR_PICKUP' || item.status === 'NOTIFIED') && (
                    <>
                      <button className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                        <CheckCircle2 className="h-3 w-3" />
                        Confirm Pickup
                      </button>
                      <button className="inline-flex h-7 items-center gap-1 rounded-md border border-destructive px-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10">
                        <X className="h-3 w-3" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {item.expiresAt && item.status !== 'PICKED_UP' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Expires: {new Date(item.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
