'use client';

import { useState } from 'react';
import { FormField } from '@caratflow/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@caratflow/ui';
import { Plus, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface TransferFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface TransferItemInput {
  productId: string;
  quantityRequested: number;
}

export function TransferForm({ onClose, onSuccess }: TransferFormProps) {
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TransferItemInput[]>([
    { productId: '', quantityRequested: 1 },
  ]);

  const createMutation = trpc.inventory.transfers.create.useMutation({
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((item) => item.productId && item.quantityRequested > 0);
    if (validItems.length === 0) return;

    createMutation.mutate({
      fromLocationId,
      toLocationId,
      notes: notes || undefined,
      items: validItems,
    });
  };

  const addItem = () => {
    setItems([...items, { productId: '', quantityRequested: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TransferItemInput, value: string | number) => {
    const updated = [...items];
    if (field === 'quantityRequested') {
      updated[index] = { ...updated[index]!, [field]: typeof value === 'string' ? parseInt(value) || 0 : value };
    } else {
      updated[index] = { ...updated[index]!, [field]: value as string };
    }
    setItems(updated);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Stock Transfer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="From Location" required>
              <input
                type="text"
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="Source location ID"
                required
              />
            </FormField>
            <FormField label="To Location" required>
              <input
                type="text"
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="Destination location ID"
                required
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Items</label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs hover:bg-accent"
              >
                <Plus className="h-3 w-3" />
                Add Item
              </button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.productId}
                  onChange={(e) => updateItem(index, 'productId', e.target.value)}
                  className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
                  placeholder="Product ID"
                  required
                />
                <input
                  type="number"
                  value={item.quantityRequested}
                  onChange={(e) => updateItem(index, 'quantityRequested', e.target.value)}
                  className="h-9 w-24 rounded-md border border-input bg-transparent px-3 text-sm"
                  min={1}
                  placeholder="Qty"
                  required
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-destructive/10 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <FormField label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              rows={2}
            />
          </FormField>

          {createMutation.error && (
            <p className="text-sm text-destructive">{createMutation.error.message}</p>
          )}

          <DialogFooter>
            <button type="button" onClick={onClose} className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-accent">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Transfer'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
