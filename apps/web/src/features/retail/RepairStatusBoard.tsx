'use client';

import * as React from 'react';
import { StatusBadge, getStatusVariant } from '@caratflow/ui';
import { cn } from '@caratflow/ui';
import { Clock, User, Wrench } from 'lucide-react';

interface RepairItem {
  id: string;
  repairNumber: string;
  customerId: string;
  customerName?: string;
  itemDescription: string;
  status: string;
  promisedDate: string | null;
  createdAt: string;
}

interface RepairStatusBoardProps {
  columns: Record<string, RepairItem[]>;
  onItemClick?: (repairId: string) => void;
  className?: string;
}

const COLUMN_CONFIG: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: 'Received', color: 'border-t-blue-500' },
  DIAGNOSED: { label: 'Diagnosed', color: 'border-t-amber-500' },
  QUOTED: { label: 'Quoted', color: 'border-t-purple-500' },
  APPROVED: { label: 'Approved', color: 'border-t-indigo-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'border-t-orange-500' },
  COMPLETED: { label: 'Completed', color: 'border-t-emerald-500' },
};

export function RepairStatusBoard({ columns, onItemClick, className }: RepairStatusBoardProps) {
  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
      {Object.entries(COLUMN_CONFIG).map(([status, config]) => {
        const items = columns[status] ?? [];
        return (
          <div
            key={status}
            className={cn(
              'flex-shrink-0 w-72 rounded-lg border border-t-4 bg-muted/30',
              config.color,
            )}
          >
            <div className="px-3 py-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{config.label}</h3>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium">
                {items.length}
              </span>
            </div>
            <div className="space-y-2 p-2 min-h-[200px]">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onItemClick?.(item.id)}
                  className="w-full rounded-md border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{item.repairNumber}</span>
                    <StatusBadge label={item.status} variant={getStatusVariant(item.status)} dot={false} />
                  </div>
                  <p className="text-sm font-medium truncate">{item.itemDescription}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {item.customerName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.customerName}
                      </span>
                    )}
                    {item.promisedDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.promisedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {items.length === 0 && (
                <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                  No items
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
