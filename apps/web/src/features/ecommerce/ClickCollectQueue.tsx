'use client';

import { cn } from '@caratflow/ui';
import { MapPin, Bell, CheckCircle2, Clock } from 'lucide-react';

interface ClickCollectItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  readyAt: string | null;
  expiresAt: string | null;
  itemCount: number;
}

interface ClickCollectQueueProps {
  items: ClickCollectItem[];
  locationName: string;
  onNotify?: (id: string) => void;
  onConfirmPickup?: (id: string) => void;
}

export function ClickCollectQueue({
  items,
  locationName,
  onNotify,
  onConfirmPickup,
}: ClickCollectQueueProps) {
  const activeItems = items.filter((i) =>
    ['READY_FOR_PICKUP', 'NOTIFIED'].includes(i.status),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{locationName}</h3>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground px-1.5">
          {activeItems.length}
        </span>
      </div>

      {activeItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No items pending pickup at this location.
        </p>
      ) : (
        <div className="space-y-2">
          {activeItems.map((item) => {
            const isNotified = item.status === 'NOTIFIED';
            const hoursWaiting = item.readyAt
              ? Math.round((Date.now() - new Date(item.readyAt).getTime()) / (1000 * 60 * 60))
              : 0;

            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-lg border p-3',
                  hoursWaiting > 48 && 'border-orange-200 bg-orange-50/50',
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium font-mono">{item.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{item.customerName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isNotified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        <Bell className="h-3 w-3" />
                        Notified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                        <Clock className="h-3 w-3" />
                        Waiting
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {!isNotified && onNotify && (
                    <button
                      onClick={() => onNotify(item.id)}
                      className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium hover:bg-accent"
                    >
                      <Bell className="h-3 w-3" />
                      Notify
                    </button>
                  )}
                  {onConfirmPickup && (
                    <button
                      onClick={() => onConfirmPickup(item.id)}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Picked Up
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
