'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { CheckCircle, XCircle, Send, AlertTriangle } from 'lucide-react';

// Mock PO detail data
const mockPO = {
  id: '1',
  poNumber: 'PO/2604/0015',
  supplierName: 'ABC Gold Refinery',
  locationName: 'Main Warehouse',
  status: 'SENT',
  subtotalPaise: 1150000_00,
  taxPaise: 50000_00,
  totalPaise: 1200000_00,
  currencyCode: 'INR',
  expectedDate: '2026-04-15',
  notes: 'Urgent order for festival season stock.',
  approvedBy: 'Admin User',
  approvedAt: '2026-04-03T10:00:00Z',
  items: [
    { id: '1', description: '22K Gold Bangles Set', quantity: 5, unitPricePaise: 150000_00, totalPaise: 750000_00, weightMg: 50000, metalPurity: 916, receivedQuantity: 0 },
    { id: '2', description: '18K Gold Chains', quantity: 10, unitPricePaise: 40000_00, totalPaise: 400000_00, weightMg: 30000, metalPurity: 750, receivedQuantity: 0 },
  ],
  receipts: [
    { id: 'r1', receiptNumber: 'GR/2604/0001', status: 'ACCEPTED', receivedAt: '2026-04-05', itemCount: 1, totalAccepted: 3 },
  ],
  threeWayMatch: [
    { poItemId: '1', description: '22K Gold Bangles Set', orderedQuantity: 5, receivedQuantity: 3, acceptedQuantity: 3, orderedPaise: 750000_00, invoicedPaise: 450000_00, quantityMatch: false, priceMatch: true, overallMatch: false },
    { poItemId: '2', description: '18K Gold Chains', orderedQuantity: 10, receivedQuantity: 0, acceptedQuantity: 0, orderedPaise: 400000_00, invoicedPaise: 0, quantityMatch: false, priceMatch: false, overallMatch: false },
  ],
  createdAt: '2026-04-03T09:00:00Z',
};

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatWeight(mg: number): string {
  return `${(mg / 1000).toFixed(3)} g`;
}

export default function PurchaseOrderDetailPage() {
  const po = mockPO;

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.poNumber}
        description={`Purchase Order for ${po.supplierName}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Purchase Orders', href: '/wholesale/purchase-orders' },
          { label: po.poNumber },
        ]}
        actions={
          <div className="flex gap-2">
            {po.status === 'DRAFT' && (
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Send className="h-4 w-4" />
                Send to Supplier
              </button>
            )}
            {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && (
              <a
                href="/wholesale/goods-receipts"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Create Receipt
              </a>
            )}
          </div>
        }
      />

      {/* PO Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1">
            <StatusBadge
              label={po.status.replace(/_/g, ' ')}
              variant={getStatusVariant(po.status)}
              dot={false}
            />
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="mt-1 text-lg font-semibold">{formatPaise(po.totalPaise)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Location</p>
          <p className="mt-1 text-sm font-medium">{po.locationName}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Expected Date</p>
          <p className="mt-1 text-sm font-medium">
            {po.expectedDate
              ? new Date(po.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Not set'}
          </p>
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Line Items</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit Price</span>
            <span>Weight</span>
            <span>Purity</span>
            <span>Received</span>
          </div>
          <div className="divide-y">
            {po.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm"
              >
                <span className="font-medium">{item.description}</span>
                <span>{item.quantity}</span>
                <span>{formatPaise(item.unitPricePaise)}</span>
                <span>{formatWeight(item.weightMg)}</span>
                <span>{item.metalPurity ? `${item.metalPurity}` : '-'}</span>
                <span className={item.receivedQuantity < item.quantity ? 'text-amber-600' : 'text-emerald-600'}>
                  {item.receivedQuantity}/{item.quantity}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t bg-muted/30 px-4 py-3">
            <div className="flex justify-end gap-8 text-sm">
              <div>
                <span className="text-muted-foreground">Subtotal: </span>
                <span className="font-medium">{formatPaise(po.subtotalPaise)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tax: </span>
                <span className="font-medium">{formatPaise(po.taxPaise)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold">{formatPaise(po.totalPaise)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Way Match */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Three-Way Match (PO vs Receipt vs Invoice)</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Item</span>
            <span>Ordered / Received</span>
            <span>Ordered / Invoiced Value</span>
            <span>Qty Match</span>
            <span>Status</span>
          </div>
          <div className="divide-y">
            {po.threeWayMatch.map((match) => (
              <div
                key={match.poItemId}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 text-sm"
              >
                <span className="font-medium">{match.description}</span>
                <span>
                  {match.acceptedQuantity}/{match.orderedQuantity}
                </span>
                <span>
                  {formatPaise(match.invoicedPaise)}/{formatPaise(match.orderedPaise)}
                </span>
                <span>
                  {match.quantityMatch ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </span>
                <span>
                  {match.overallMatch ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle className="h-3.5 w-3.5" /> Matched
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> Mismatch
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Receipt History */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Receipt History</h2>
        <div className="rounded-lg border divide-y">
          {po.receipts.map((receipt) => (
            <div key={receipt.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-medium font-mono">{receipt.receiptNumber}</span>
                <span className="ml-3">
                  <StatusBadge
                    label={receipt.status}
                    variant={getStatusVariant(receipt.status)}
                    dot={false}
                  />
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {receipt.totalAccepted} items accepted &middot; {new Date(receipt.receivedAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          ))}
          {po.receipts.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No receipts yet</div>
          )}
        </div>
      </div>

      {/* Notes */}
      {po.notes && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</h2>
          <div className="rounded-lg border p-4 text-sm">{po.notes}</div>
        </div>
      )}
    </div>
  );
}
