'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';

const invoice = {
  id: '1', invoiceNumber: 'EI/2604/0012', invoiceType: 'COMMERCIAL', buyerName: 'Diamond Corp USA',
  currencyCode: 'USD', exchangeRate: 830000, subtotalPaise: 5000000_00, igstPaise: 0, totalPaise: 5200000_00,
  lutNumber: 'LUT-2025-001', lutDate: '2025-04-01', adCode: 'AD-0012345',
  ieCode: 'AABCD1234E', preCarriageBy: 'Road', placeOfReceipt: 'JNPT Mumbai',
  vesselFlightNo: 'MAEU-2604-XYZ', portOfLoading: 'Nhava Sheva, Mumbai',
  portOfDischarge: 'Port of New York', finalDestination: 'New York, USA',
  items: [
    { description: '22K Gold Necklace Set', hsCode: '7113.19', quantity: 5, unitPricePaise: 500000_00, totalPricePaise: 2500000_00, weightMg: 125000, netWeightMg: 120000, countryOfOrigin: 'IN' },
    { description: '18K Diamond Ring Collection', hsCode: '7113.19', quantity: 10, unitPricePaise: 250000_00, totalPricePaise: 2500000_00, weightMg: 85000, netWeightMg: 80000, countryOfOrigin: 'IN' },
  ],
};

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function ExportInvoiceDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        description={`${invoice.invoiceType} invoice for ${invoice.buyerName}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Invoices', href: '/export/invoices' },
          { label: invoice.invoiceNumber },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shipping Details */}
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Shipping Details</h3>
          <div className="grid gap-2 text-sm">
            {[
              ['Pre-Carriage By', invoice.preCarriageBy],
              ['Place of Receipt', invoice.placeOfReceipt],
              ['Vessel / Flight', invoice.vesselFlightNo],
              ['Port of Loading', invoice.portOfLoading],
              ['Port of Discharge', invoice.portOfDischarge],
              ['Final Destination', invoice.finalDestination],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Regulatory Details */}
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Regulatory Details</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">IE Code</span><span className="font-mono font-medium">{invoice.ieCode}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">AD Code</span><span className="font-mono font-medium">{invoice.adCode}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">LUT Number</span><span className="font-mono font-medium text-green-600">{invoice.lutNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">LUT Date</span><span className="font-medium">{invoice.lutDate}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span className="font-medium">{invoice.currencyCode} @ {(invoice.exchangeRate / 10000).toFixed(4)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="font-medium">{invoice.igstPaise === 0 ? 'Zero-rated (LUT)' : formatPaise(invoice.igstPaise)}</span></div>
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">HS Code</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Gross Wt</th>
              <th className="px-4 py-3 text-right font-medium">Net Wt</th>
              <th className="px-4 py-3 text-right font-medium">Unit Price</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoice.items.map((item, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3"><div>{item.description}</div><div className="text-xs text-muted-foreground">Origin: {item.countryOfOrigin}</div></td>
                <td className="px-4 py-3 font-mono">{item.hsCode}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">{(item.weightMg / 1000).toFixed(3)} g</td>
                <td className="px-4 py-3 text-right">{(item.netWeightMg / 1000).toFixed(3)} g</td>
                <td className="px-4 py-3 text-right">{formatPaise(item.unitPricePaise)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatPaise(item.totalPricePaise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/30">
            <tr><td colSpan={6} className="px-4 py-2 text-right text-muted-foreground">Subtotal</td><td className="px-4 py-2 text-right font-semibold">{formatPaise(invoice.subtotalPaise)}</td></tr>
            <tr><td colSpan={6} className="px-4 py-2 text-right text-muted-foreground">IGST</td><td className="px-4 py-2 text-right">{formatPaise(invoice.igstPaise)}</td></tr>
            <tr className="border-t"><td colSpan={6} className="px-4 py-2 text-right font-semibold">Total</td><td className="px-4 py-2 text-right text-lg font-bold">{formatPaise(invoice.totalPaise)}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
