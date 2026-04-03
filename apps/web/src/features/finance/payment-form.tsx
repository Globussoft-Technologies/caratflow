'use client';

import * as React from 'react';

interface PaymentFormProps {
  paymentType: 'RECEIVED' | 'MADE';
  customers?: Array<{ id: string; firstName: string; lastName: string }>;
  suppliers?: Array<{ id: string; name: string }>;
  invoices?: Array<{ id: string; invoiceNumber: string; totalPaise: number; paidPaise: number }>;
  onSubmit: (data: {
    paymentType: string;
    method: string;
    amountPaise: number;
    customerId?: string;
    supplierId?: string;
    invoiceId?: string;
    reference?: string;
  }) => void;
  isLoading?: boolean;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online' },
] as const;

export function PaymentForm({
  paymentType,
  customers,
  suppliers,
  invoices,
  onSubmit,
  isLoading,
}: PaymentFormProps) {
  const [method, setMethod] = React.useState('CASH');
  const [amountRupees, setAmountRupees] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [supplierId, setSupplierId] = React.useState('');
  const [invoiceId, setInvoiceId] = React.useState('');
  const [reference, setReference] = React.useState('');

  const isReceived = paymentType === 'RECEIVED';

  const selectedInvoice = invoices?.find((i) => i.id === invoiceId);
  const outstandingPaise = selectedInvoice
    ? selectedInvoice.totalPaise - selectedInvoice.paidPaise
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaise = Math.round(parseFloat(amountRupees) * 100);
    onSubmit({
      paymentType,
      method,
      amountPaise,
      customerId: isReceived ? customerId || undefined : undefined,
      supplierId: !isReceived ? supplierId || undefined : undefined,
      invoiceId: invoiceId || undefined,
      reference: reference || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {isReceived ? (
          <div>
            <label className="block text-sm font-medium text-foreground">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select customer</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-foreground">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select supplier</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground">Payment Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Invoice (Optional)</label>
          <select
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">No linked invoice</option>
            {invoices?.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} - Outstanding: {((inv.totalPaise - inv.paidPaise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </option>
            ))}
          </select>
          {selectedInvoice && (
            <p className="mt-1 text-xs text-muted-foreground">
              Outstanding: {(outstandingPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Amount</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-2 text-sm text-muted-foreground">&#8377;</span>
            <input
              type="number"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="0.00"
              className="block w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm"
              min="0.01"
              step="0.01"
              required
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground">Reference</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transaction reference, cheque number, etc."
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || !amountRupees}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : `Record ${isReceived ? 'Receipt' : 'Payment'}`}
        </button>
      </div>
    </form>
  );
}
