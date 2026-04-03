'use client';

import { PageHeader, DataTable, StatusBadge } from '@caratflow/ui';
import type { ColumnDef } from '@caratflow/ui';

interface LoyaltyTxRow {
  id: string;
  customerName: string;
  transactionType: string;
  points: number;
  balanceAfter: number;
  referenceType: string | null;
  description: string | null;
  createdAt: Date;
}

const transactions: LoyaltyTxRow[] = [
  { id: '1', customerName: 'Priya Sharma', transactionType: 'EARNED', points: 250, balanceAfter: 2500, referenceType: 'SALE', description: 'Points earned from sale INV-2024-001', createdAt: new Date(Date.now() - 2 * 86400000) },
  { id: '2', customerName: 'Rahul Mehta', transactionType: 'REDEEMED', points: -1000, balanceAfter: 7200, referenceType: 'SALE', description: 'Redeemed at POS', createdAt: new Date(Date.now() - 3 * 86400000) },
  { id: '3', customerName: 'Anita Desai', transactionType: 'EARNED', points: 45, balanceAfter: 450, referenceType: 'SALE', description: 'Points earned from sale INV-2024-003', createdAt: new Date(Date.now() - 4 * 86400000) },
  { id: '4', customerName: 'Vikram Singh', transactionType: 'BONUS', points: 500, balanceAfter: 12000, referenceType: 'CAMPAIGN', description: 'Festival bonus points', createdAt: new Date(Date.now() - 5 * 86400000) },
  { id: '5', customerName: 'Meena Patel', transactionType: 'EXPIRED', points: -50, balanceAfter: 100, referenceType: 'EXPIRY', description: 'Points expired', createdAt: new Date(Date.now() - 6 * 86400000) },
];

const columns: ColumnDef<LoyaltyTxRow>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ getValue }) => (getValue() as Date).toLocaleDateString('en-IN'),
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
  },
  {
    accessorKey: 'transactionType',
    header: 'Type',
    cell: ({ getValue }) => {
      const type = getValue() as string;
      const variantMap: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
        EARNED: 'success',
        REDEEMED: 'warning',
        EXPIRED: 'danger',
        ADJUSTED: 'info',
        BONUS: 'success',
      };
      return <StatusBadge label={type} variant={variantMap[type] ?? 'default'} />;
    },
  },
  {
    accessorKey: 'points',
    header: 'Points',
    cell: ({ getValue }) => {
      const pts = getValue() as number;
      return (
        <span className={`font-medium ${pts > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {pts > 0 ? '+' : ''}{pts.toLocaleString('en-IN')}
        </span>
      );
    },
  },
  {
    accessorKey: 'balanceAfter',
    header: 'Balance',
    cell: ({ getValue }) => (getValue() as number).toLocaleString('en-IN'),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">{(getValue() as string) ?? '-'}</span>
    ),
  },
];

export default function LoyaltyTransactionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty Transactions"
        description="View all loyalty point transactions."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Loyalty', href: '/crm/loyalty' },
          { label: 'Transactions' },
        ]}
      />

      <DataTable
        columns={columns}
        data={transactions}
        searchKey="customerName"
        searchPlaceholder="Search by customer..."
      />
    </div>
  );
}
