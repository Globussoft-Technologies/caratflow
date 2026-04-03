'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Package, FileText, Ship, Shield, Clock } from 'lucide-react';

// Mock order detail
const order = {
  id: '1',
  orderNumber: 'EXP/CF/2604/0008',
  buyerName: 'Diamond Corp USA',
  buyerCountry: 'US',
  status: 'SHIPPED',
  currencyCode: 'USD',
  exchangeRate: 830000, // 83.0000
  subtotalPaise: 5000000_00,
  dutyPaise: 0,
  shippingPaise: 150000_00,
  insurancePaise: 50000_00,
  totalPaise: 5200000_00,
  incoterms: 'FOB',
  paymentTerms: 'LC 60 days',
  expectedShipDate: '2026-04-05',
  actualShipDate: '2026-04-04',
  items: [
    { id: '1', description: '22K Gold Necklace Set', quantity: 5, unitPricePaise: 500000_00, totalPricePaise: 2500000_00, hsCode: '7113.19', weightMg: 125000, metalPurity: 916, countryOfOrigin: 'IN' },
    { id: '2', description: '18K Diamond Ring Collection', quantity: 10, unitPricePaise: 250000_00, totalPricePaise: 2500000_00, hsCode: '7113.19', weightMg: 85000, metalPurity: 750, countryOfOrigin: 'IN' },
  ],
  documents: [
    { type: 'PACKING_LIST', status: 'VERIFIED', number: 'PL-2604-008' },
    { type: 'SHIPPING_BILL', status: 'VERIFIED', number: 'SB-2604-008' },
    { type: 'BILL_OF_LADING', status: 'ISSUED', number: 'BL-MAEU-2604' },
    { type: 'CERTIFICATE_OF_ORIGIN', status: 'ISSUED', number: 'COO-2604-008' },
  ],
  timeline: [
    { date: '2026-04-01', event: 'Order Created', status: 'DRAFT' },
    { date: '2026-04-01', event: 'Order Confirmed', status: 'CONFIRMED' },
    { date: '2026-04-02', event: 'Production Complete', status: 'READY' },
    { date: '2026-04-03', event: 'Customs Cleared', status: 'CUSTOMS_CLEARED' },
    { date: '2026-04-04', event: 'Shipped via Maersk', status: 'SHIPPED' },
  ],
};

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatWeight(mg: number): string {
  return `${(mg / 1000).toFixed(3)} g`;
}

export default function ExportOrderDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Export Order ${order.orderNumber}`}
        description={`${order.buyerName} - ${order.buyerCountry}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Orders', href: '/export/orders' },
          { label: order.orderNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              label={order.status.replace(/_/g, ' ')}
              variant={getStatusVariant(order.status)}
              dot={false}
            />
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Currency</p>
          <p className="text-lg font-semibold">{order.currencyCode}</p>
          <p className="text-xs text-muted-foreground">Rate: {(order.exchangeRate / 10000).toFixed(4)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Incoterms</p>
          <p className="text-lg font-semibold">{order.incoterms}</p>
          <p className="text-xs text-muted-foreground">{order.paymentTerms}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="text-lg font-semibold">{formatPaise(order.totalPaise)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Ship Date</p>
          <p className="text-lg font-semibold">{order.actualShipDate ?? order.expectedShipDate}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Order Items</h2>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">HS Code</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Weight</th>
                  <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div>{item.description}</div>
                      <div className="text-xs text-muted-foreground">Purity: {item.metalPurity} | Origin: {item.countryOfOrigin}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{item.hsCode}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatWeight(item.weightMg)}</td>
                    <td className="px-4 py-3 text-right">{formatPaise(item.unitPricePaise)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatPaise(item.totalPricePaise)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr><td colSpan={5} className="px-4 py-2 text-right text-muted-foreground">Subtotal</td><td className="px-4 py-2 text-right font-semibold">{formatPaise(order.subtotalPaise)}</td></tr>
                <tr><td colSpan={5} className="px-4 py-2 text-right text-muted-foreground">Shipping</td><td className="px-4 py-2 text-right">{formatPaise(order.shippingPaise)}</td></tr>
                <tr><td colSpan={5} className="px-4 py-2 text-right text-muted-foreground">Insurance</td><td className="px-4 py-2 text-right">{formatPaise(order.insurancePaise)}</td></tr>
                <tr className="border-t"><td colSpan={5} className="px-4 py-2 text-right font-semibold">Total</td><td className="px-4 py-2 text-right text-lg font-bold">{formatPaise(order.totalPaise)}</td></tr>
              </tfoot>
            </table>
          </div>

          {/* Documents */}
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">Documents</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {order.documents.map((doc) => (
              <div key={doc.type} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground font-mono">{doc.number}</p>
                  </div>
                </div>
                <StatusBadge
                  label={doc.status}
                  variant={getStatusVariant(doc.status)}
                  dot={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Timeline</h2>
          <div className="space-y-0">
            {order.timeline.map((event, idx) => (
              <div key={idx} className="flex gap-3 pb-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  {idx < order.timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-medium">{event.event}</p>
                  <p className="text-xs text-muted-foreground">{event.date}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance Checklist */}
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">Compliance</h2>
          <div className="rounded-lg border divide-y">
            {[
              { label: 'Commercial Invoice', done: true },
              { label: 'Packing List', done: true },
              { label: 'Shipping Bill', done: true },
              { label: 'Bill of Lading', done: true },
              { label: 'Certificate of Origin', done: true },
              { label: 'Hallmark Verification', done: true },
            ].map((check) => (
              <div key={check.label} className="flex items-center gap-2 p-2.5">
                <div className={`h-4 w-4 rounded-full flex items-center justify-center text-xs ${check.done ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                  {check.done ? '\u2713' : '\u2022'}
                </div>
                <span className="text-sm">{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
