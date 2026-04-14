'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, getStatusVariant, DataTable, type ColumnDef } from '@caratflow/ui';
import { Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { PaymentForm } from '@/features/finance/payment-form';

interface PaymentRow {
  id: string;
  paymentNumber: string;
  paymentType: string;
  method: string;
  date: string;
  partyName: string;
  amountPaise: number;
  invoiceNumber: string;
  status: string;
}

const mockPayments: PaymentRow[] = [
  { id: '1', paymentNumber: 'PAY-202604-0008', paymentType: 'RECEIVED', method: 'UPI', date: '2026-04-03', partyName: 'Priya Sharma', amountPaise: 100000_00, invoiceNumber: 'INV-202604-0012', status: 'COMPLETED' },
  { id: '2', paymentNumber: 'PAY-202604-0007', paymentType: 'MADE', method: 'BANK_TRANSFER', date: '2026-04-02', partyName: 'Rajesh Gold Suppliers', amountPaise: 200000_00, invoiceNumber: 'PINV-202604-0005', status: 'COMPLETED' },
  { id: '3', paymentNumber: 'PAY-202604-0006', paymentType: 'RECEIVED', method: 'CASH', date: '2026-04-01', partyName: 'Walk-in Customer', amountPaise: 12500_00, invoiceNumber: 'INV-202604-0010', status: 'COMPLETED' },
  { id: '4', paymentNumber: 'PAY-202604-0005', paymentType: 'RECEIVED', method: 'CARD', date: '2026-04-01', partyName: 'Amit Patel', amountPaise: 50000_00, invoiceNumber: 'INV-202604-0011', status: 'COMPLETED' },
];

const mockCustomers = [
  { id: 'cust-1', firstName: 'Priya', lastName: 'Sharma' },
  { id: 'cust-2', firstName: 'Amit', lastName: 'Patel' },
];

const mockSuppliers = [
  { id: 'sup-1', name: 'Rajesh Gold Suppliers' },
  { id: 'sup-2', name: 'Bombay Bullion House' },
];

const columns: ColumnDef<PaymentRow, unknown>[] = [
  { accessorKey: 'paymentNumber', header: 'Payment #', cell: ({ row }) => (
    <span className="font-mono text-sm">{row.original.paymentNumber}</span>
  )},
  { accessorKey: 'paymentType', header: 'Type', cell: ({ row }) => (
    <span className="inline-flex items-center gap-1 text-sm">
      {row.original.paymentType === 'RECEIVED' ? (
        <><ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" /> Received</>
      ) : (
        <><ArrowUpRight className="h-3.5 w-3.5 text-red-600" /> Made</>
      )}
    </span>
  )},
  { accessorKey: 'method', header: 'Method', cell: ({ row }) => {
    const labels: Record<string, string> = { CASH: 'Cash', CARD: 'Card', UPI: 'UPI', BANK_TRANSFER: 'Bank', CHEQUE: 'Cheque', ONLINE: 'Online' };
    return <span>{labels[row.original.method] ?? row.original.method}</span>;
  }},
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'partyName', header: 'Party' },
  { accessorKey: 'amountPaise', header: 'Amount', cell: ({ row }) => (
    <span className={`font-mono font-medium ${row.original.paymentType === 'RECEIVED' ? 'text-emerald-600' : 'text-red-600'}`}>
      {(row.original.amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
    </span>
  )},
  { accessorKey: 'invoiceNumber', header: 'Invoice', cell: ({ row }) => (
    <span className="text-muted-foreground">{row.original.invoiceNumber}</span>
  )},
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
    <StatusBadge label={row.original.status} variant={getStatusVariant(row.original.status)} />
  )},
];

export default function PaymentsPage() {
  const [showForm, setShowForm] = React.useState(false);
  const [paymentType, setPaymentType] = React.useState<'RECEIVED' | 'MADE'>('RECEIVED');

  const handleSubmit = (data: unknown) => {
    // Will call trpc.financial.payments.record.mutate(data)
    console.log('Record payment:', data);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track all payments received and made."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payments' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Record Payment
          </button>
        }
      />

      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex gap-2">
            {(['RECEIVED', 'MADE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPaymentType(type)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  paymentType === type ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'
                }`}
              >
                {type === 'RECEIVED' ? 'Payment Received' : 'Payment Made'}
              </button>
            ))}
          </div>
          <PaymentForm
            paymentType={paymentType}
            customers={mockCustomers}
            suppliers={mockSuppliers}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      <DataTable
        columns={columns}
        data={mockPayments}
        searchKey="paymentNumber"
        searchPlaceholder="Search payments..."
      />
    </div>
  );
}
