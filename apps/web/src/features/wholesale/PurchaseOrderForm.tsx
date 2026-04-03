'use client';

import { useState } from 'react';
import { cn } from '@caratflow/ui';
import { Plus, Trash2, X } from 'lucide-react';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPricePaise: number;
  weightMg: number;
  metalPurity: number;
}

interface PurchaseOrderFormProps {
  onSubmit: (data: {
    supplierId: string;
    locationId: string;
    items: LineItem[];
    expectedDate?: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function PurchaseOrderForm({ onSubmit, onCancel }: PurchaseOrderFormProps) {
  const [supplierId, setSupplierId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPricePaise: 0, weightMg: 0, metalPurity: 916 },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      { id: String(Date.now()), description: '', quantity: 1, unitPricePaise: 0, weightMg: 0, metalPurity: 916 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const subtotal = items.reduce((sum, i) => sum + i.unitPricePaise * i.quantity, 0);

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">New Purchase Order</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Supplier *</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select supplier...</option>
            <option value="s1">ABC Gold Refinery</option>
            <option value="s2">Silver Craft Ltd</option>
            <option value="s3">Diamond Hub</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Delivery Location *</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select location...</option>
            <option value="l1">Main Warehouse</option>
            <option value="l2">Showroom</option>
            <option value="l3">Workshop</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Expected Delivery Date</label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          />
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

      {/* Line Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Line Items</label>
          <button
            onClick={addItem}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3 w-3" /> Add Item
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-end">
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">Description</label>}
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Item description"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">Qty</label>}
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">Unit Price (Rs)</label>}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPricePaise / 100}
                  onChange={(e) => updateItem(item.id, 'unitPricePaise', Math.round(parseFloat(e.target.value) * 100) || 0)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">Weight (g)</label>}
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={item.weightMg / 1000}
                  onChange={(e) => updateItem(item.id, 'weightMg', Math.round(parseFloat(e.target.value) * 1000) || 0)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">Purity</label>}
                <select
                  value={item.metalPurity}
                  onChange={(e) => updateItem(item.id, 'metalPurity', parseInt(e.target.value))}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value={999}>24K (999)</option>
                  <option value={916}>22K (916)</option>
                  <option value={750}>18K (750)</option>
                  <option value={585}>14K (585)</option>
                </select>
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">&nbsp;</label>}
                <button
                  onClick={() => removeItem(item.id)}
                  className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50"
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-end border-t pt-4">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Subtotal</p>
          <p className="text-lg font-bold">{formatPaise(subtotal)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onSubmit({
              supplierId,
              locationId,
              items,
              expectedDate: expectedDate || undefined,
              notes: notes || undefined,
            })
          }
          disabled={!supplierId || !locationId || items.some((i) => !i.description)}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Purchase Order
        </button>
      </div>
    </div>
  );
}
