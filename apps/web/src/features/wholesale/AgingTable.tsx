'use client';

import { cn } from '@caratflow/ui';
import { StatusBadge, getStatusVariant } from '@caratflow/ui';

interface AgingItem {
  id: string;
  entityType: string;
  entityName: string;
  invoiceNumber: string;
  amountPaise: number;
  balancePaise: number;
  dueDate: string;
  status: string;
  daysOverdue: number;
}

interface AgingTableProps {
  items: AgingItem[];
  className?: string;
}

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function getAgingColor(status: string): string {
  switch (status) {
    case 'CURRENT':
      return '';
    case 'OVERDUE_30':
      return 'text-amber-600';
    case 'OVERDUE_60':
      return 'text-orange-600';
    case 'OVERDUE_90':
      return 'text-red-500';
    case 'OVERDUE_120_PLUS':
      return 'text-red-700 font-semibold';
    default:
      return '';
  }
}

function getAgingLabel(status: string): string {
  switch (status) {
    case 'CURRENT':
      return 'Current';
    case 'OVERDUE_30':
      return '1-30 Days';
    case 'OVERDUE_60':
      return '31-60 Days';
    case 'OVERDUE_90':
      return '61-90 Days';
    case 'OVERDUE_120_PLUS':
      return '90+ Days';
    default:
      return status;
  }
}

export function AgingTable({ items, className }: AgingTableProps) {
  return (
    <div className={cn('rounded-lg border', className)}>
      <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>Type</span>
        <span>Entity / Invoice</span>
        <span>Amount</span>
        <span>Balance</span>
        <span>Due Date</span>
        <span>Days Overdue</span>
        <span>Aging</span>
      </div>
      <div className="divide-y">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm"
          >
            <span className="text-xs">
              <span className={cn(
                'inline-flex rounded px-1.5 py-0.5',
                item.entityType === 'CUSTOMER' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700',
              )}>
                {item.entityType === 'CUSTOMER' ? 'Customer' : 'Supplier'}
              </span>
            </span>
            <div>
              <p className="font-medium">{item.entityName}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.invoiceNumber}</p>
            </div>
            <span>{formatPaise(item.amountPaise)}</span>
            <span className="font-semibold">{formatPaise(item.balancePaise)}</span>
            <span className="text-muted-foreground">
              {new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className={getAgingColor(item.status)}>
              {item.daysOverdue > 0 ? `${item.daysOverdue} days` : '-'}
            </span>
            <span>
              <StatusBadge
                label={getAgingLabel(item.status)}
                variant={getStatusVariant(item.status === 'CURRENT' ? 'COMPLETED' : item.status.includes('120') ? 'CANCELLED' : 'DRAFT')}
                dot={false}
              />
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No outstanding payments
          </div>
        )}
      </div>
    </div>
  );
}
