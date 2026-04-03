'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { CheckCircle, XCircle } from 'lucide-react';

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// Mock return detail
const mockReturn = {
  id: '1',
  returnNumber: 'RT/MUM/2604/0002',
  originalSaleNumber: 'SL/MUM/2604/0009',
  customerName: 'Anita Desai',
  status: 'DRAFT',
  reason: 'Customer not satisfied with design',
  refundAmountPaise: 85000_00,
  metalRateDifferencePaise: 2500_00,
  refundMethod: 'CASH',
  items: [
    { id: 'ri1', description: '22K Gold Ring - Classic', quantity: 1, returnPricePaise: 85000_00, reason: 'Wrong size' },
  ],
  createdAt: new Date().toISOString(),
};

export default function ReturnDetailPage() {
  const r = mockReturn;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Return ${r.returnNumber}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Returns', href: '/retail/returns' },
          { label: r.returnNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge label={r.status} variant={getStatusVariant(r.status)} />
            {r.status === 'DRAFT' && (
              <>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/50 px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Original Sale</h3>
          <a href={`/retail/sales/1`} className="mt-1 font-mono font-medium text-primary hover:underline">
            {r.originalSaleNumber}
          </a>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
          <p className="mt-1 font-medium">{r.customerName}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Refund Method</h3>
          <p className="mt-1 font-medium">{r.refundMethod}</p>
        </div>
      </div>

      {r.reason && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Reason</h3>
          <p className="mt-1">{r.reason}</p>
        </div>
      )}

      {/* Return Items */}
      <div className="rounded-lg border">
        <div className="bg-muted/30 px-4 py-2 text-sm font-medium">Return Items</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">Item</th>
              <th className="px-4 py-2 text-right font-medium">Qty</th>
              <th className="px-4 py-2 text-right font-medium">Return Price</th>
              <th className="px-4 py-2 text-left font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {r.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="px-4 py-2">{item.description}</td>
                <td className="px-4 py-2 text-right">{item.quantity}</td>
                <td className="px-4 py-2 text-right font-medium">{formatPaise(item.returnPricePaise)}</td>
                <td className="px-4 py-2 text-muted-foreground">{item.reason ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-72 space-y-1 text-sm rounded-lg border p-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Refund Amount</span>
            <span className="font-medium">{formatPaise(r.refundAmountPaise)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Metal Rate Difference</span>
            <span className={r.metalRateDifferencePaise >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {r.metalRateDifferencePaise >= 0 ? '+' : ''}{formatPaise(r.metalRateDifferencePaise)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
