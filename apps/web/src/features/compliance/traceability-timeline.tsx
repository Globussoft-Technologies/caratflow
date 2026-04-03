'use client';

import {
  Package, Truck, Factory, ArrowLeftRight, ShoppingBag, RotateCcw,
} from 'lucide-react';

interface CustodyEvent {
  id: string;
  eventType: string;
  fromEntityType: string | null;
  fromEntityId: string | null;
  toEntityType: string | null;
  toEntityId: string | null;
  eventDate: string;
  documentReference: string | null;
  notes: string | null;
}

interface TraceabilityTimelineProps {
  events: CustodyEvent[];
}

const eventConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  SOURCED: { icon: <Package className="h-3.5 w-3.5" />, color: 'text-blue-600', label: 'Sourced' },
  IMPORTED: { icon: <Truck className="h-3.5 w-3.5" />, color: 'text-indigo-600', label: 'Imported' },
  MANUFACTURED: { icon: <Factory className="h-3.5 w-3.5" />, color: 'text-teal-600', label: 'Manufactured' },
  TRANSFERRED: { icon: <ArrowLeftRight className="h-3.5 w-3.5" />, color: 'text-purple-600', label: 'Transferred' },
  SOLD: { icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'text-emerald-600', label: 'Sold' },
  RETURNED: { icon: <RotateCcw className="h-3.5 w-3.5" />, color: 'text-amber-600', label: 'Returned' },
};

export function TraceabilityTimeline({ events }: TraceabilityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-6">
        No custody events recorded for this product.
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

      {events.map((event) => {
        const config = eventConfig[event.eventType] ?? {
          icon: <Package className="h-3.5 w-3.5" />,
          color: 'text-gray-600',
          label: event.eventType,
        };

        return (
          <div key={event.id} className="relative flex gap-4 py-2">
            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background ${config.color}`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{config.label}</span>
                {event.documentReference && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {event.documentReference}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {event.fromEntityType && (
                  <span>From: {event.fromEntityType} </span>
                )}
                {event.toEntityType && (
                  <span>To: {event.toEntityType}</span>
                )}
              </div>
              {event.notes && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.notes}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(event.eventDate).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
