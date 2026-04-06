"use client";

import { formatDate, cn } from "@/lib/utils";
import type { OrderTimelineEntry, OrderStatus } from "@/lib/types";

interface OrderTimelineProps {
  timeline: OrderTimelineEntry[];
  currentStatus: OrderStatus;
}

const STATUS_ORDER: OrderStatus[] = [
  "placed",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export default function OrderTimeline({ timeline, currentStatus }: OrderTimelineProps) {
  if (currentStatus === "cancelled" || currentStatus === "returned") {
    return (
      <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-lg">
        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <div>
          <p className="font-medium text-rose-700">{STATUS_LABELS[currentStatus]}</p>
          <p className="text-sm text-rose-600">
            {timeline[timeline.length - 1]?.description}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {STATUS_ORDER.map((status, index) => {
          const entry = timeline.find((t) => t.status === status);
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={status} className="flex flex-col items-center relative flex-1">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={cn(
                    "absolute top-3.5 right-1/2 w-full h-0.5",
                    index <= currentIndex ? "bg-gold" : "bg-gray-200"
                  )}
                  style={{ left: "-50%" }}
                />
              )}

              {/* Circle */}
              <div
                className={cn(
                  "relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  isCompleted
                    ? "bg-gold text-white"
                    : "bg-gray-200 text-navy/30"
                )}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-current" />
                )}
                {isCurrent && (
                  <span className="absolute -inset-1 rounded-full border-2 border-gold animate-pulse" />
                )}
              </div>

              {/* Label */}
              <p className={cn(
                "text-[10px] font-medium mt-2 text-center",
                isCompleted ? "text-navy" : "text-navy/40"
              )}>
                {STATUS_LABELS[status]}
              </p>
              {entry && (
                <p className="text-[9px] text-navy/40 mt-0.5">
                  {formatDate(entry.timestamp)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
