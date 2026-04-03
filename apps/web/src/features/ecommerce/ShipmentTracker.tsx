'use client';

import { cn } from '@caratflow/ui';
import { Package, Truck, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ShipmentTrackerProps {
  shipmentNumber: string;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
  estimatedDeliveryDate: string | null;
}

const statusSteps = [
  { key: 'LABEL_CREATED', label: 'Label Created', icon: Package },
  { key: 'PICKED_UP', label: 'Picked Up', icon: Package },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: MapPin },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
] as const;

const statusOrder: Record<string, number> = {
  LABEL_CREATED: 0,
  PICKED_UP: 1,
  IN_TRANSIT: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
  RETURNED: -1,
};

export function ShipmentTracker({
  shipmentNumber,
  carrier,
  trackingNumber,
  status,
  estimatedDeliveryDate,
}: ShipmentTrackerProps) {
  const currentStep = statusOrder[status] ?? 0;
  const isReturned = status === 'RETURNED';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium font-mono">{shipmentNumber}</p>
          {carrier && <p className="text-xs text-muted-foreground">{carrier}</p>}
        </div>
        {trackingNumber && (
          <span className="text-xs font-mono text-muted-foreground">{trackingNumber}</span>
        )}
      </div>

      {isReturned ? (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>Shipment returned</span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStep;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isCompleted ? 'text-primary' : 'text-muted-foreground/30',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] text-center leading-tight',
                      isCompleted ? 'text-primary font-medium' : 'text-muted-foreground/50',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < statusSteps.length - 1 && (
                  <div
                    className={cn(
                      'h-px flex-1 -mt-4',
                      index < currentStep ? 'bg-primary' : 'bg-muted-foreground/20',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {estimatedDeliveryDate && !isReturned && status !== 'DELIVERED' && (
        <p className="text-xs text-muted-foreground">
          Estimated delivery: {new Date(estimatedDeliveryDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
