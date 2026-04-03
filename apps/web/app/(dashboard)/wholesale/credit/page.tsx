'use client';

import { PageHeader } from '@caratflow/ui';
import { AlertTriangle } from 'lucide-react';
import { CreditLimitBadge, AgingTable } from '@/features/wholesale';

const mockCreditLimits = [
  { id: '1', entityType: 'CUSTOMER' as const, entityName: 'Priya Jewellers', creditLimitPaise: 5000000_00, currentOutstandingPaise: 2500000_00, availableCreditPaise: 2500000_00 },
  { id: '2', entityType: 'CUSTOMER' as const, entityName: 'Gold Emporium', creditLimitPaise: 3000000_00, currentOutstandingPaise: 2800000_00, availableCreditPaise: 200000_00 },
  { id: '3', entityType: 'SUPPLIER' as const, entityName: 'ABC Gold Refinery', creditLimitPaise: 10000000_00, currentOutstandingPaise: 1800000_00, availableCreditPaise: 8200000_00 },
  { id: '4', entityType: 'SUPPLIER' as const, entityName: 'Diamond Hub', creditLimitPaise: 8000000_00, currentOutstandingPaise: 3200000_00, availableCreditPaise: 4800000_00 },
];

const mockAgingSummary = {
  current: { count: 8, totalPaise: 1500000_00 },
  overdue30: { count: 3, totalPaise: 800000_00 },
  overdue60: { count: 2, totalPaise: 450000_00 },
  overdue90: { count: 1, totalPaise: 200000_00 },
  overdue120Plus: { count: 1, totalPaise: 150000_00 },
};

const mockOutstanding = [
  { id: '1', entityType: 'CUSTOMER', entityName: 'Priya Jewellers', invoiceNumber: 'INV/2604/0045', amountPaise: 350000_00, balancePaise: 350000_00, dueDate: '2026-04-10', status: 'CURRENT', daysOverdue: 0 },
  { id: '2', entityType: 'CUSTOMER', entityName: 'Gold Emporium', invoiceNumber: 'INV/2604/0038', amountPaise: 520000_00, balancePaise: 520000_00, dueDate: '2026-03-05', status: 'OVERDUE_30', daysOverdue: 30 },
  { id: '3', entityType: 'SUPPLIER', entityName: 'ABC Gold Refinery', invoiceNumber: 'INV/2604/0041', amountPaise: 180000_00, balancePaise: 90000_00, dueDate: '2026-02-15', status: 'OVERDUE_60', daysOverdue: 48 },
  { id: '4', entityType: 'CUSTOMER', entityName: 'Diamond Plaza', invoiceNumber: 'INV/2603/0028', amountPaise: 200000_00, balancePaise: 200000_00, dueDate: '2025-12-20', status: 'OVERDUE_120_PLUS', daysOverdue: 105 },
];

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `\u20B9${(rupees / 1000).toFixed(1)}K`;
  return `\u20B9${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export default function CreditPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit & Outstanding"
        description="Credit limits, outstanding payments, and aging reports."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Credit & Aging' },
        ]}
      />

      {/* Aging Summary */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Aging Summary</h2>
        <div className="grid gap-4 sm:grid-cols-5">
          {[
            { label: 'Current', data: mockAgingSummary.current, color: 'text-emerald-600 bg-emerald-50' },
            { label: '1-30 Days', data: mockAgingSummary.overdue30, color: 'text-amber-600 bg-amber-50' },
            { label: '31-60 Days', data: mockAgingSummary.overdue60, color: 'text-orange-600 bg-orange-50' },
            { label: '61-90 Days', data: mockAgingSummary.overdue90, color: 'text-red-500 bg-red-50' },
            { label: '90+ Days', data: mockAgingSummary.overdue120Plus, color: 'text-red-700 bg-red-100' },
          ].map((bucket) => (
            <div key={bucket.label} className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{bucket.label}</p>
              <p className={`mt-1 text-lg font-bold ${bucket.color.split(' ')[0]}`}>
                {formatPaise(bucket.data.totalPaise)}
              </p>
              <p className="text-xs text-muted-foreground">{bucket.data.count} invoices</p>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Limits */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Credit Limits</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {mockCreditLimits.map((cl) => (
            <CreditLimitBadge
              key={cl.id}
              entityName={cl.entityName}
              entityType={cl.entityType}
              creditLimitPaise={cl.creditLimitPaise}
              outstandingPaise={cl.currentOutstandingPaise}
              availablePaise={cl.availableCreditPaise}
            />
          ))}
        </div>
      </div>

      {/* Outstanding Payments */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Payments</h2>
        <AgingTable items={mockOutstanding} />
      </div>
    </div>
  );
}
