'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { OutstandingTable } from '../../../../src/features/wholesale/OutstandingTable';
import { CreditLimitCard } from '../../../../src/features/wholesale/CreditLimitCard';

const mockCreditLimits = [
  { entityType: 'CUSTOMER', entityName: 'Priya Jewellers', creditLimitPaise: 5000000_00, usedPaise: 2500000_00, availablePaise: 2500000_00 },
  { entityType: 'CUSTOMER', entityName: 'Gold Emporium', creditLimitPaise: 10000000_00, usedPaise: 8500000_00, availablePaise: 1500000_00 },
  { entityType: 'SUPPLIER', entityName: 'ABC Gold Refinery', creditLimitPaise: 20000000_00, usedPaise: 5000000_00, availablePaise: 15000000_00 },
];

const mockOutstandingBalances = [
  { id: '1', entityType: 'CUSTOMER', entityName: 'Priya Jewellers', invoiceNumber: 'INV/2604/0045', dueDate: '2026-04-10', originalPaise: 350000_00, paidPaise: 0, balancePaise: 350000_00, status: 'CURRENT', daysOverdue: 0 },
  { id: '2', entityType: 'CUSTOMER', entityName: 'Gold Emporium', invoiceNumber: 'INV/2603/0038', dueDate: '2026-03-15', originalPaise: 520000_00, paidPaise: 100000_00, balancePaise: 420000_00, status: 'OVERDUE', daysOverdue: 20 },
  { id: '3', entityType: 'SUPPLIER', entityName: 'ABC Gold Refinery', invoiceNumber: 'INV/2604/0041', dueDate: '2026-04-15', originalPaise: 1800000_00, paidPaise: 0, balancePaise: 1800000_00, status: 'CURRENT', daysOverdue: 0 },
  { id: '4', entityType: 'SUPPLIER', entityName: 'Diamond Hub', invoiceNumber: 'INV/2602/0022', dueDate: '2026-02-28', originalPaise: 750000_00, paidPaise: 250000_00, balancePaise: 500000_00, status: 'OVERDUE', daysOverdue: 35 },
];

export default function OutstandingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Outstanding & Credit"
        description="Outstanding balances (AR/AP) with aging and credit limit status."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Outstanding' },
        ]}
      />

      {/* Credit Limits */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Credit Limits</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockCreditLimits.map((cl, idx) => (
            <CreditLimitCard key={idx} {...cl} />
          ))}
        </div>
      </div>

      {/* Outstanding Balances */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Outstanding Balances</h2>
        <OutstandingTable balances={mockOutstandingBalances} />
      </div>
    </div>
  );
}
