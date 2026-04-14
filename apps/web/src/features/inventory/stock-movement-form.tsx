'use client';

import { useState } from 'react';
import { FormField } from '@caratflow/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { MovementType } from '@caratflow/shared-types';

interface StockMovementFormProps {
  stockItemId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const movementTypes = [
  { value: 'IN', label: 'Inward' },
  { value: 'OUT', label: 'Outward' },
  { value: 'ADJUST', label: 'Adjustment' },
  { value: 'RETURN', label: 'Return' },
  { value: 'PRODUCTION', label: 'Production' },
] as const;

export function StockMovementForm({ stockItemId, onClose, onSuccess }: StockMovementFormProps) {
  const [formData, setFormData] = useState({
    stockItemId: stockItemId ?? '',
    movementType: MovementType.IN as MovementType,
    quantityChange: 0,
    referenceType: '',
    notes: '',
  });

  const recordMutation = trpc.inventory.movements.record.useMutation({
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = formData.movementType === 'OUT'
      ? -Math.abs(formData.quantityChange)
      : Math.abs(formData.quantityChange);

    recordMutation.mutate({
      stockItemId: formData.stockItemId,
      movementType: formData.movementType,
      quantityChange: qty,
      referenceType: formData.referenceType || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!stockItemId && (
            <FormField label="Stock Item ID" required>
              <input
                type="text"
                value={formData.stockItemId}
                onChange={(e) => setFormData({ ...formData, stockItemId: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                required
              />
            </FormField>
          )}
          <FormField label="Movement Type" required>
            <select
              value={formData.movementType}
              onChange={(e) => setFormData({ ...formData, movementType: e.target.value as typeof formData.movementType })}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {movementTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Quantity" required description={formData.movementType === 'OUT' ? 'Will be deducted from stock' : 'Will be added to stock'}>
            <input
              type="number"
              value={formData.quantityChange}
              onChange={(e) => setFormData({ ...formData, quantityChange: parseInt(e.target.value) || 0 })}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              min={1}
              required
            />
          </FormField>
          <FormField label="Reference Type">
            <input
              type="text"
              value={formData.referenceType}
              onChange={(e) => setFormData({ ...formData, referenceType: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              placeholder="e.g. PURCHASE_ORDER, MANUAL"
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              rows={2}
            />
          </FormField>

          {recordMutation.error && (
            <p className="text-sm text-destructive">{recordMutation.error.message}</p>
          )}

          <DialogFooter>
            <button type="button" onClick={onClose} className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-accent">
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordMutation.isPending}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {recordMutation.isPending ? 'Recording...' : 'Record Movement'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
