'use client';

import { StatusBadge, getStatusVariant } from '@caratflow/ui';

interface OutstandingBalance {
  id: string;
  entityType: string;
  entityName: string;
  invoiceNumber: string;
  dueDate: string;
  originalPaise: number;
  paidPaise: number;
  balancePaise: number;
  status: string;
  daysOverdue: number;
}

interface OutstandingTableProps {
  balances: OutstandingBalance[];
}

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export function OutstandingTable({ balances }: OutstandingTableProps) {
  const receivables = balances.filter((b) => b.entityType === 'CUSTOMER');
  const payables = balances.filter((b) => b.entityType === 'SUPPLIER');

  const renderSection = (title: string, items: OutstandingBalance[]) => (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="rounded-lg border">
        <div className="grid grid-cols-8 gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-2">Entity</div>
          <div>Invoice</div>
          <div>Due Date</div>
          <div className="text-right">Original</div>
          <div className="text-right">Paid</div>
          <div className="text-right">Balance</div>
          <div>Status</div>
        </div>
        {items.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No outstanding balances</div>
        ) : (
          items.map((b) => (
            <div key={b.id} className="grid grid-cols-8 gap-3 border-b px-4 py-2.5 last:border-b-0">
              <div className="col-span-2 text-sm font-medium">{b.entityName}</div>
              <div className="text-sm font-mono">{b.invoiceNumber}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(b.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                {b.daysOverdue > 0 && (
                  <span className="ml-1 text-red-600 text-xs">({b.daysOverdue}d)</span>
                )}
              </div>
              <div className="text-sm text-right">{formatPaise(b.originalPaise)}</div>
              <div className="text-sm text-right">{formatPaise(b.paidPaise)}</div>
              <div className="text-sm text-right font-medium">{formatPaise(b.balancePaise)}</div>
              <div>
                <StatusBadge
                  label={b.status.replace(/_/g, ' ')}
                  variant={b.daysOverdue > 0 ? 'warning' : 'success'}
                  dot={false}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderSection('Accounts Receivable (Customer Balances)', receivables)}
      {renderSection('Accounts Payable (Supplier Balances)', payables)}
    </div>
  );
}
