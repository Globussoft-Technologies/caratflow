'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Truck } from 'lucide-react';
import { ConsignmentTracker } from '@/features/wholesale';

const mockConsignmentsIn = [
  { id: '1', consignmentNumber: 'MEMO-IN/2604/0005', supplierName: 'ABC Gold Refinery', status: 'RECEIVED', totalWeightMg: 300000, totalValuePaise: 2100000_00, receivedAt: '2026-04-01', dueDate: '2026-04-15' },
  { id: '2', consignmentNumber: 'MEMO-IN/2604/0004', supplierName: 'Diamond Hub', status: 'PARTIALLY_RETURNED', totalWeightMg: 50000, totalValuePaise: 800000_00, receivedAt: '2026-03-25', dueDate: '2026-04-08' },
  { id: '3', consignmentNumber: 'MEMO-IN/2604/0003', supplierName: 'Silver Craft Ltd', status: 'PURCHASED', totalWeightMg: 180000, totalValuePaise: 450000_00, receivedAt: '2026-03-20', dueDate: '2026-04-03' },
];

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function formatWeight(mg: number): string {
  return `${(mg / 1000).toFixed(3)} g`;
}

export default function ConsignmentsInPage() {
  const [showTracker, setShowTracker] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Consignments"
        description="Track items received from suppliers on memo/approval basis."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Incoming Consignments' },
        ]}
        actions={
          <button
            onClick={() => setShowTracker(!showTracker)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Receive Consignment
          </button>
        }
      />

      {showTracker && (
        <ConsignmentTracker
          direction="in"
          onClose={() => setShowTracker(false)}
        />
      )}

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>Memo Number</span>
          <span>Supplier</span>
          <span>Status</span>
          <span>Weight</span>
          <span>Value</span>
          <span>Due Date</span>
        </div>
        <div className="divide-y">
          {mockConsignmentsIn.map((c) => {
            const isOverdue = c.dueDate && new Date(c.dueDate) < new Date() && !['RETURNED', 'PURCHASED'].includes(c.status);
            return (
              <div
                key={c.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm transition-colors hover:bg-accent"
              >
                <span className="font-medium font-mono">{c.consignmentNumber}</span>
                <span>{c.supplierName}</span>
                <span>
                  <StatusBadge
                    label={c.status.replace(/_/g, ' ')}
                    variant={getStatusVariant(c.status)}
                    dot={false}
                  />
                </span>
                <span>{formatWeight(c.totalWeightMg)}</span>
                <span className="font-semibold">{formatPaise(c.totalValuePaise)}</span>
                <span className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                  {c.dueDate
                    ? new Date(c.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                    : '-'}
                  {isOverdue && ' (overdue)'}
                </span>
              </div>
            );
          })}
          {mockConsignmentsIn.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Truck className="h-8 w-8 mb-2" />
              <p className="text-sm">No incoming consignments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
