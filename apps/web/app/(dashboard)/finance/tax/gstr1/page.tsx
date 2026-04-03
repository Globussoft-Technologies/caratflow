'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';

// Mock GSTR-1 data
const mockGstr1 = {
  period: '04-2026',
  b2b: [
    {
      gstin: '27AABCT1234F1ZX',
      invoices: [
        { invoiceNumber: 'INV-202604-0012', invoiceDate: '2026-04-03', totalPaise: 190550_00, taxableAmountPaise: 185000_00, cgstPaise: 2775_00, sgstPaise: 2775_00, igstPaise: 0 },
      ],
    },
  ],
  b2c: [
    { invoiceNumber: 'INV-202604-0010', invoiceDate: '2026-04-01', totalPaise: 12875_00, taxableAmountPaise: 12500_00, cgstPaise: 187_50, sgstPaise: 187_50, igstPaise: 0 },
  ],
  hsnSummary: [
    { hsnCode: '7113', description: 'Articles of jewellery', quantity: 5, taxableAmountPaise: 350000_00, cgstPaise: 5250_00, sgstPaise: 5250_00, igstPaise: 0, cessPaise: 0, totalTaxPaise: 10500_00 },
  ],
  totalTaxableAmount: 350000_00,
  totalCgst: 5250_00,
  totalSgst: 5250_00,
  totalIgst: 0,
};

export default function Gstr1Page() {
  const d = mockGstr1;
  const formatAmount = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="GSTR-1 Worksheet"
        description={`Outward supplies summary for period ${d.period}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Tax', href: '/finance/tax' },
          { label: 'GSTR-1' },
        ]}
      />

      {/* B2B Section */}
      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">B2B - Supplies to Registered Dealers</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="px-4 py-2 text-left font-medium">GSTIN</th>
              <th className="px-4 py-2 text-left font-medium">Invoice #</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-right font-medium">Taxable</th>
              <th className="px-4 py-2 text-right font-medium">CGST</th>
              <th className="px-4 py-2 text-right font-medium">SGST</th>
              <th className="px-4 py-2 text-right font-medium">IGST</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {d.b2b.flatMap((entry) =>
              entry.invoices.map((inv) => (
                <tr key={inv.invoiceNumber} className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">{entry.gstin}</td>
                  <td className="px-4 py-2">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2">{inv.invoiceDate}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatAmount(inv.taxableAmountPaise)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatAmount(inv.cgstPaise)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatAmount(inv.sgstPaise)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatAmount(inv.igstPaise)}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium">{formatAmount(inv.totalPaise)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      {/* B2C Section */}
      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">B2C - Supplies to Unregistered Buyers</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="px-4 py-2 text-left font-medium">Invoice #</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-right font-medium">Taxable</th>
              <th className="px-4 py-2 text-right font-medium">CGST</th>
              <th className="px-4 py-2 text-right font-medium">SGST</th>
              <th className="px-4 py-2 text-right font-medium">IGST</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {d.b2c.map((inv) => (
              <tr key={inv.invoiceNumber} className="border-b">
                <td className="px-4 py-2">{inv.invoiceNumber}</td>
                <td className="px-4 py-2">{inv.invoiceDate}</td>
                <td className="px-4 py-2 text-right font-mono">{formatAmount(inv.taxableAmountPaise)}</td>
                <td className="px-4 py-2 text-right font-mono">{formatAmount(inv.cgstPaise)}</td>
                <td className="px-4 py-2 text-right font-mono">{formatAmount(inv.sgstPaise)}</td>
                <td className="px-4 py-2 text-right font-mono">{formatAmount(inv.igstPaise)}</td>
                <td className="px-4 py-2 text-right font-mono font-medium">{formatAmount(inv.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HSN Summary */}
      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">HSN-wise Summary</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="px-4 py-2 text-left font-medium">HSN Code</th>
              <th className="px-4 py-2 text-left font-medium">Description</th>
              <th className="px-4 py-2 text-right font-medium">Qty</th>
              <th className="px-4 py-2 text-right font-medium">Taxable Value</th>
              <th className="px-4 py-2 text-right font-medium">Total Tax</th>
            </tr>
          </thead>
          <tbody>
            {d.hsnSummary.map((hsn) => (
              <tr key={hsn.hsnCode} className="border-b">
                <td className="px-4 py-2 font-mono">{hsn.hsnCode}</td>
                <td className="px-4 py-2">{hsn.description}</td>
                <td className="px-4 py-2 text-right">{hsn.quantity}</td>
                <td className="px-4 py-2 text-right font-mono">{formatAmount(hsn.taxableAmountPaise)}</td>
                <td className="px-4 py-2 text-right font-mono font-medium">{formatAmount(hsn.totalTaxPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Taxable</p>
            <p className="text-lg font-bold">{formatAmount(d.totalTaxableAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total CGST</p>
            <p className="text-lg font-bold">{formatAmount(d.totalCgst)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total SGST</p>
            <p className="text-lg font-bold">{formatAmount(d.totalSgst)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total IGST</p>
            <p className="text-lg font-bold">{formatAmount(d.totalIgst)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
