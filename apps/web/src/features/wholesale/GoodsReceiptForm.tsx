'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface ReceiptItem {
  id: string;
  poItemId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason: string;
}

interface GoodsReceiptFormProps {
  onSubmit: (data: { purchaseOrderId: string; items: ReceiptItem[]; notes?: string }) => void;
  onCancel: () => void;
}

export function GoodsReceiptForm({ onSubmit, onCancel }: GoodsReceiptFormProps) {
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([
    { id: '1', poItemId: '', receivedQuantity: 0, acceptedQuantity: 0, rejectedQuantity: 0, rejectionReason: '' },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      { id: String(Date.now()), poItemId: '', receivedQuantity: 0, acceptedQuantity: 0, rejectedQuantity: 0, rejectionReason: '' },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ReceiptItem, value: string | number) => {
    setItems(items.map((i) => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      // Auto-calculate: accepted = received - rejected
      if (field === 'receivedQuantity' || field === 'rejectedQuantity') {
        const received = field === 'receivedQuantity' ? (value as number) : updated.receivedQuantity;
        const rejected = field === 'rejectedQuantity' ? (value as number) : updated.rejectedQuantity;
        updated.acceptedQuantity = Math.max(0, received - rejected);
      }
      return updated;
    }));
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">New Goods Receipt</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Purchase Order *</label>
          <select
            value={purchaseOrderId}
            onChange={(e) => setPurchaseOrderId(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select PO...</option>
            <option value="po1">PO/2604/0015 - ABC Gold Refinery</option>
            <option value="po2">PO/2604/0014 - Silver Craft Ltd</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
      </div>

      {/* Receipt Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Received Items</label>
          <button onClick={addItem} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3 w-3" /> Add Item
          </button>
        </div>

        {items.map((item, idx) => (
          <div key={item.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_2fr_auto] gap-2 items-end">
            <div>
              {idx === 0 && <label className="text-xs text-muted-foreground">Received</label>}
              <input
                type="number"
                min="0"
                value={item.receivedQuantity}
                onChange={(e) => updateItem(item.id, 'receivedQuantity', parseInt(e.target.value) || 0)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <div>
              {idx === 0 && <label className="text-xs text-muted-foreground">Accepted</label>}
              <input
                type="number"
                min="0"
                value={item.acceptedQuantity}
                readOnly
                className="h-9 w-full rounded-md border bg-muted px-3 text-sm"
              />
            </div>
            <div>
              {idx === 0 && <label className="text-xs text-muted-foreground">Rejected</label>}
              <input
                type="number"
                min="0"
                value={item.rejectedQuantity}
                onChange={(e) => updateItem(item.id, 'rejectedQuantity', parseInt(e.target.value) || 0)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <div>
              {idx === 0 && <label className="text-xs text-muted-foreground">&nbsp;</label>}
              {/* Spacer */}
            </div>
            <div>
              {idx === 0 && <label className="text-xs text-muted-foreground">Rejection Reason</label>}
              <input
                type="text"
                value={item.rejectionReason}
                onChange={(e) => updateItem(item.id, 'rejectionReason', e.target.value)}
                placeholder={item.rejectedQuantity > 0 ? 'Enter reason...' : ''}
                disabled={item.rejectedQuantity === 0}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
              />
            </div>
            <div>
              {idx === 0 && <label className="text-xs text-muted-foreground">&nbsp;</label>}
              <button
                onClick={() => removeItem(item.id)}
                className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500"
                disabled={items.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <button onClick={onCancel} className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-accent">
          Cancel
        </button>
        <button
          onClick={() => onSubmit({ purchaseOrderId, items, notes: notes || undefined })}
          disabled={!purchaseOrderId}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Create Receipt
        </button>
      </div>
    </div>
  );
}
