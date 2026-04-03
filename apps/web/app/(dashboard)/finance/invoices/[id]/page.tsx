'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { TaxBreakdownDisplay } from '@/features/finance/tax-breakdown-display';
import { Printer, Send, Ban, CreditCard } from 'lucide-react';

// Mock invoice detail
const mockInvoice = {
  id: '1',
  invoiceNumber: 'INV-202604-0012',
  invoiceType: 'SALES',
  status: 'PARTIALLY_PAID',
  date: '2026-04-03',
  dueDate: '2026-05-03',
  customerName: 'Priya Sharma',
  customerGstin: '27AABCT1234F1ZX',
  locationName: 'Zaveri Bazaar - Main',
  subtotalPaise: 185000_00,
  discountPaise: 0,
  taxPaise: 5550_00,
  totalPaise: 190550_00,
  paidPaise: 100000_00,
  currencyCode: 'INR',
  sourceState: 'MH',
  destState: 'MH',
  notes: 'Thank you for your purchase.',
  lineItems: [
    {
      id: 'li-1',
      description: '22K Gold Necklace - 25g',
      quantity: 1,
      unitPricePaise: 150000_00,
      discountPaise: 0,
      taxableAmountPaise: 150000_00,
      hsnCode: '7113',
      gstRate: 300,
      cgstPaise: 2250_00,
      sgstPaise: 2250_00,
      igstPaise: 0,
      totalPaise: 154500_00,
    },
    {
      id: 'li-2',
      description: 'Making Charges',
      quantity: 1,
      unitPricePaise: 35000_00,
      discountPaise: 0,
      taxableAmountPaise: 35000_00,
      hsnCode: '7113',
      gstRate: 300,
      cgstPaise: 525_00,
      sgstPaise: 525_00,
      igstPaise: 0,
      totalPaise: 36050_00,
    },
  ],
  payments: [
    { id: 'pay-1', paymentNumber: 'PAY-202604-0008', date: '2026-04-03', method: 'UPI', amountPaise: 100000_00 },
  ],
};

export default function InvoiceDetailPage() {
  const params = useParams();

  const inv = mockInvoice; // Will use tRPC: trpc.financial.invoices.getById.useQuery({ id })
  const isInterState = inv.sourceState.toUpperCase() !== inv.destState.toUpperCase();

  const formatAmount = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice ${inv.invoiceNumber}`}
        description={`${inv.invoiceType === 'SALES' ? 'Sales' : 'Purchase'} Invoice`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Invoices', href: '/finance/invoices' },
          { label: inv.invoiceNumber },
        ]}
        actions={
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <Send className="h-4 w-4" /> Send
            </button>
            <button className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
              <CreditCard className="h-4 w-4" /> Record Payment
            </button>
          </div>
        }
      />

      {/* Invoice Header */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={inv.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium">{inv.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Due Date</span>
              <span className="text-sm font-medium">{inv.dueDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Customer</span>
              <span className="text-sm font-medium">{inv.customerName}</span>
            </div>
            {inv.customerGstin && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">GSTIN</span>
                <span className="text-sm font-mono">{inv.customerGstin}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Location</span>
              <span className="text-sm">{inv.locationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Supply Type</span>
              <span className="text-sm">{isInterState ? 'Inter-state' : 'Intra-state'} ({inv.sourceState} to {inv.destState})</span>
            </div>
          </div>
        </div>

        <TaxBreakdownDisplay
          taxableAmountPaise={inv.subtotalPaise}
          cgstPaise={inv.lineItems.reduce((s, l) => s + l.cgstPaise, 0)}
          sgstPaise={inv.lineItems.reduce((s, l) => s + l.sgstPaise, 0)}
          igstPaise={inv.lineItems.reduce((s, l) => s + l.igstPaise, 0)}
          cgstRate={150}
          sgstRate={150}
          igstRate={isInterState ? 300 : 0}
          isInterState={isInterState}
        />
      </div>

      {/* Line Items */}
      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Line Items</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="px-4 py-2 text-left font-medium">Description</th>
              <th className="px-4 py-2 text-left font-medium">HSN</th>
              <th className="px-4 py-2 text-right font-medium">Qty</th>
              <th className="px-4 py-2 text-right font-medium">Unit Price</th>
              <th className="px-4 py-2 text-right font-medium">Tax</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.lineItems.map((line) => (
              <tr key={line.id} className="border-b">
                <td className="px-4 py-2">{line.description}</td>
                <td className="px-4 py-2 text-muted-foreground">{line.hsnCode}</td>
                <td className="px-4 py-2 text-right">{line.quantity}</td>
                <td className="px-4 py-2 text-right font-mono">{formatAmount(line.unitPricePaise)}</td>
                <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                  {formatAmount(line.cgstPaise + line.sgstPaise + line.igstPaise)}
                </td>
                <td className="px-4 py-2 text-right font-mono font-medium">{formatAmount(line.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td colSpan={5} className="px-4 py-2 text-right font-semibold">Grand Total:</td>
              <td className="px-4 py-2 text-right font-mono text-base font-bold">{formatAmount(inv.totalPaise)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment History */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Payment History</h3>
          <div className="text-sm">
            <span className="text-muted-foreground">Paid: </span>
            <span className="font-mono font-medium text-emerald-600">{formatAmount(inv.paidPaise)}</span>
            <span className="text-muted-foreground"> / </span>
            <span className="font-mono font-medium">{formatAmount(inv.totalPaise)}</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="px-4 py-2 text-left font-medium">Payment #</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium">Method</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.payments.map((pay) => (
              <tr key={pay.id} className="border-b">
                <td className="px-4 py-2 font-mono">{pay.paymentNumber}</td>
                <td className="px-4 py-2">{pay.date}</td>
                <td className="px-4 py-2">{pay.method}</td>
                <td className="px-4 py-2 text-right font-mono text-emerald-600">{formatAmount(pay.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {inv.totalPaise - inv.paidPaise > 0 && (
          <div className="px-4 py-3 border-t bg-amber-50 dark:bg-amber-950/20">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Outstanding: {formatAmount(inv.totalPaise - inv.paidPaise)}
            </span>
          </div>
        )}
      </div>

      {inv.notes && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold">Notes</h3>
          <p className="text-sm text-muted-foreground">{inv.notes}</p>
        </div>
      )}
    </div>
  );
}
