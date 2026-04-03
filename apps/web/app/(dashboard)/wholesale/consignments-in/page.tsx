'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus } from 'lucide-react';

const mockConsignmentsIn = [
  { id: '1', consignmentNumber: 'CI/2604/0005', supplierName: 'ABC Gold Refinery', totalWeightMg: 100000, totalValuePaise: 1500000_00, status: 'RECEIVED', receivedDate: '2026-04-01', dueDate: '2026-04-30' },
  { id: '2', consignmentNumber: 'CI/2604/0004', supplierName: 'Diamond Hub', totalWeightMg: 5000, totalValuePaise: 3200000_00, status: 'PARTIALLY_RETURNED', receivedDate: '2026-03-25', dueDate: '2026-04-25' },
  { id: '3', consignmentNumber: 'CI/2604/0003', supplierName: 'Gem Suppliers Inc', totalWeightMg: 8000, totalValuePaise: 2100000_00, status: 'PURCHASED', receivedDate: '2026-03-15', dueDate: '2026-04-15' },
];

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `\u20B9${(rupees / 1000).toFixed(1)}K`;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

function formatWeight(mg: number): string {
  return `${(mg / 1000).toFixed(3)} g`;
}

export default function ConsignmentsInPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Consignments"
        description="Items received from suppliers on memo/consignment basis."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Consignments In' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Record Consignment
          </button>
        }
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-7 gap-4 border-b px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-2">Consignment #</div>
          <div>Supplier</div>
          <div className="text-right">Weight</div>
          <div className="text-right">Value</div>
          <div>Status</div>
          <div>Due Date</div>
        </div>
        {mockConsignmentsIn.map((c) => (
          <a
            key={c.id}
            href={`/wholesale/consignments-in/${c.id}`}
            className="grid grid-cols-7 gap-4 border-b px-4 py-3 transition-colors hover:bg-accent last:border-b-0"
          >
            <div className="col-span-2 font-mono text-sm font-medium">{c.consignmentNumber}</div>
            <div className="text-sm">{c.supplierName}</div>
            <div className="text-sm text-right">{formatWeight(c.totalWeightMg)}</div>
            <div className="text-sm text-right font-medium">{formatPaise(c.totalValuePaise)}</div>
            <div>
              <StatusBadge label={c.status.replace(/_/g, ' ')} variant={getStatusVariant(c.status)} dot={false} />
            </div>
            <div className="text-sm text-muted-foreground">{new Date(c.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
