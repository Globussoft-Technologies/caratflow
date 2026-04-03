'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Package, Plus } from 'lucide-react';

const mockConsignmentsOut = [
  { id: '1', consignmentNumber: 'CO/2604/0008', customerName: 'Priya Jewellers', totalWeightMg: 50000, totalValuePaise: 850000_00, status: 'ISSUED', issuedDate: '2026-04-02', dueDate: '2026-04-30' },
  { id: '2', consignmentNumber: 'CO/2604/0007', customerName: 'Gold Emporium', totalWeightMg: 85000, totalValuePaise: 1200000_00, status: 'PARTIALLY_RETURNED', issuedDate: '2026-03-28', dueDate: '2026-04-25' },
  { id: '3', consignmentNumber: 'CO/2604/0006', customerName: 'Silver Palace', totalWeightMg: 120000, totalValuePaise: 450000_00, status: 'RETURNED', issuedDate: '2026-03-20', dueDate: '2026-04-20' },
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

export default function ConsignmentsOutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Outgoing Consignments"
        description="Memo/consignment items sent to customers for approval."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Consignments Out' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Consignment
          </button>
        }
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-7 gap-4 border-b px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-2">Consignment #</div>
          <div>Customer</div>
          <div className="text-right">Weight</div>
          <div className="text-right">Value</div>
          <div>Status</div>
          <div>Due Date</div>
        </div>
        {mockConsignmentsOut.map((c) => (
          <a
            key={c.id}
            href={`/wholesale/consignments-out/${c.id}`}
            className="grid grid-cols-7 gap-4 border-b px-4 py-3 transition-colors hover:bg-accent last:border-b-0"
          >
            <div className="col-span-2 font-mono text-sm font-medium">{c.consignmentNumber}</div>
            <div className="text-sm">{c.customerName}</div>
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
