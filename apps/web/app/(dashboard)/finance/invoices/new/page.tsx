'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { InvoiceForm } from '@/features/finance/invoice-form';

const mockLocations = [
  { id: 'loc-1', name: 'Zaveri Bazaar - Main', state: 'MH' },
  { id: 'loc-2', name: 'Andheri Branch', state: 'MH' },
];

const mockCustomers = [
  { id: 'cust-1', firstName: 'Priya', lastName: 'Sharma' },
  { id: 'cust-2', firstName: 'Amit', lastName: 'Patel' },
  { id: 'cust-3', firstName: 'Sunita', lastName: 'Reddy' },
];

const mockSuppliers = [
  { id: 'sup-1', name: 'Rajesh Gold Suppliers' },
  { id: 'sup-2', name: 'Bombay Bullion House' },
  { id: 'sup-3', name: 'Diamond World Exports' },
];

export default function NewInvoicePage() {
  const router = useRouter();
  const [invoiceType, setInvoiceType] = React.useState<'SALES' | 'PURCHASE'>('SALES');

  const handleSubmit = (data: unknown) => {
    // Will call trpc.financial.invoices.create.mutate(data)
    console.log('Create invoice:', data);
    router.push('/finance/invoices');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Invoice"
        description="Create a sales or purchase invoice with automatic GST computation."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Invoices', href: '/finance/invoices' },
          { label: 'New Invoice' },
        ]}
      />

      <div className="flex gap-2">
        {(['SALES', 'PURCHASE'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setInvoiceType(type)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              invoiceType === type
                ? 'bg-primary text-primary-foreground'
                : 'border bg-background hover:bg-accent'
            }`}
          >
            {type === 'SALES' ? 'Sales Invoice' : 'Purchase Invoice'}
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <InvoiceForm
          invoiceType={invoiceType}
          customers={mockCustomers}
          suppliers={mockSuppliers}
          locations={mockLocations}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
