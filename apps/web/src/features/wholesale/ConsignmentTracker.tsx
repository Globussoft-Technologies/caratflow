'use client';

import { X } from 'lucide-react';

interface ConsignmentTrackerProps {
  direction: 'in' | 'out';
  onClose: () => void;
}

export function ConsignmentTracker({ direction, onClose }: ConsignmentTrackerProps) {
  const isOut = direction === 'out';

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {isOut ? 'New Outgoing Consignment (Memo)' : 'Receive Incoming Consignment'}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">
            {isOut ? 'Customer *' : 'Supplier *'}
          </label>
          <select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{isOut ? 'Select customer...' : 'Select supplier...'}</option>
            {isOut ? (
              <>
                <option value="c1">Priya Jewellers</option>
                <option value="c2">Gold Emporium</option>
                <option value="c3">Diamond Plaza</option>
              </>
            ) : (
              <>
                <option value="s1">ABC Gold Refinery</option>
                <option value="s2">Silver Craft Ltd</option>
                <option value="s3">Diamond Hub</option>
              </>
            )}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Location *</label>
          <select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">Select location...</option>
            <option value="l1">Main Warehouse</option>
            <option value="l2">Showroom</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Due Date</label>
          <input
            type="date"
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Notes</label>
          <input
            type="text"
            placeholder="Optional notes..."
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Items</label>
        <div className="rounded-lg border p-4 text-sm text-muted-foreground text-center">
          Add items by searching products or entering manually.
          <br />
          Each item requires product, quantity, weight, and value.
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <button onClick={onClose} className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-accent">
          Cancel
        </button>
        <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {isOut ? 'Create Consignment' : 'Receive Consignment'}
        </button>
      </div>
    </div>
  );
}
