'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Package } from 'lucide-react';
import { GoodsReceiptForm } from '@/features/wholesale';

const mockReceipts = [
  { id: 'r1', receiptNumber: 'GR/2604/0003', poNumber: 'PO/2604/0015', supplierName: 'ABC Gold Refinery', status: 'ACCEPTED', receivedAt: '2026-04-05', itemCount: 3, totalAccepted: 8 },
  { id: 'r2', receiptNumber: 'GR/2604/0002', poNumber: 'PO/2604/0014', supplierName: 'Silver Craft Ltd', status: 'INSPECTED', receivedAt: '2026-04-04', itemCount: 2, totalAccepted: 5 },
  { id: 'r3', receiptNumber: 'GR/2604/0001', poNumber: 'PO/2604/0012', supplierName: 'Diamond Hub', status: 'DRAFT', receivedAt: '2026-04-03', itemCount: 4, totalAccepted: 0 },
];

export default function GoodsReceiptsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipts"
        description="Receive and inspect goods against purchase orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Goods Receipts' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Receipt
          </button>
        }
      />

      {showForm && (
        <GoodsReceiptForm
          onSubmit={(data) => {
            console.log('Create receipt:', data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>Receipt #</span>
          <span>PO Number</span>
          <span>Supplier</span>
          <span>Status</span>
          <span>Items</span>
          <span>Received</span>
        </div>
        <div className="divide-y">
          {mockReceipts.map((receipt) => (
            <div
              key={receipt.id}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm transition-colors hover:bg-accent"
            >
              <span className="font-medium font-mono">{receipt.receiptNumber}</span>
              <span className="font-mono text-muted-foreground">{receipt.poNumber}</span>
              <span>{receipt.supplierName}</span>
              <span>
                <StatusBadge
                  label={receipt.status}
                  variant={getStatusVariant(receipt.status)}
                  dot={false}
                />
              </span>
              <span>{receipt.itemCount} items</span>
              <span className="text-muted-foreground">
                {new Date(receipt.receivedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          ))}
          {mockReceipts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-8 w-8 mb-2" />
              <p className="text-sm">No goods receipts yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
