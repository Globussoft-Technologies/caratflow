'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';

const invoices = [
  { id: '1', invoiceNumber: 'EI/2604/0012', orderNumber: 'EXP/CF/2604/0008', invoiceType: 'COMMERCIAL', buyerName: 'Diamond Corp USA', totalPaise: 5200000_00, currencyCode: 'USD', ieCode: 'AABCD1234E', lutNumber: 'LUT-2025-001', createdAt: '2026-04-03' },
  { id: '2', invoiceNumber: 'PI/2604/0011', orderNumber: 'EXP/CF/2604/0007', invoiceType: 'PROFORMA', buyerName: 'Al Maktoum Jewels', totalPaise: 3800000_00, currencyCode: 'AED', ieCode: 'AABCD1234E', lutNumber: null, createdAt: '2026-04-02' },
  { id: '3', invoiceNumber: 'CI/2604/0010', orderNumber: 'EXP/CF/2604/0006', invoiceType: 'CUSTOMS', buyerName: 'London Gold Ltd', totalPaise: 2100000_00, currencyCode: 'GBP', ieCode: 'AABCD1234E', lutNumber: 'LUT-2025-001', createdAt: '2026-04-01' },
];

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function ExportInvoicesPage() {
  const [filter, setFilter] = useState<string>('ALL');

  const filtered = filter === 'ALL' ? invoices : invoices.filter((i) => i.invoiceType === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Invoices"
        description="Commercial, proforma, and customs invoices for exports."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Invoices' },
        ]}
        actions={
          <a href="/export/invoices/new" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Invoice
          </a>
        }
      />

      <div className="flex items-center gap-2">
        {['ALL', 'COMMERCIAL', 'PROFORMA', 'CUSTOMS'].map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filter === t ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Invoice</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Buyer</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">IE Code</th>
              <th className="px-4 py-3 text-left font-medium">LUT</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-accent/50">
                <td className="px-4 py-3"><a href={`/export/invoices/${inv.id}`} className="font-mono text-primary hover:underline">{inv.invoiceNumber}</a></td>
                <td className="px-4 py-3"><StatusBadge label={inv.invoiceType} variant={getStatusVariant(inv.invoiceType)} dot={false} /></td>
                <td className="px-4 py-3 font-mono text-xs">{inv.orderNumber}</td>
                <td className="px-4 py-3">{inv.buyerName}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatPaise(inv.totalPaise)} <span className="text-xs text-muted-foreground">{inv.currencyCode}</span></td>
                <td className="px-4 py-3 font-mono text-xs">{inv.ieCode}</td>
                <td className="px-4 py-3">{inv.lutNumber ? <span className="text-xs font-mono text-green-600">{inv.lutNumber}</span> : <span className="text-xs text-muted-foreground">N/A</span>}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
