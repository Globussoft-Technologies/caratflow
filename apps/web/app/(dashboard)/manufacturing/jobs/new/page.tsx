'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';

export default function NewJobOrderPage() {
  const [formData, setFormData] = React.useState({
    productId: '',
    bomId: '',
    locationId: '',
    karigarId: '',
    customerId: '',
    priority: 'MEDIUM',
    quantity: 1,
    estimatedStartDate: '',
    estimatedEndDate: '',
    notes: '',
    specialInstructions: '',
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Will integrate with tRPC mutation
    console.log('Creating job order:', formData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Job Order"
        description="Create a production job order."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Job Orders', href: '/manufacturing/jobs' },
          { label: 'New' },
        ]}
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Product & BOM */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold">Product & BOM</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product *</label>
              <select
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={formData.productId}
                onChange={(e) => handleChange('productId', e.target.value)}
                required
              >
                <option value="">Select product...</option>
                <option value="p1">22K Gold Necklace</option>
                <option value="p2">18K Diamond Ring</option>
                <option value="p3">Silver Temple Jewellery</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">BOM (optional)</label>
              <select
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={formData.bomId}
                onChange={(e) => handleChange('bomId', e.target.value)}
              >
                <option value="">Ad-hoc (no BOM)</option>
                <option value="b1">22K Gold Necklace BOM v2</option>
                <option value="b2">18K Diamond Ring BOM v1</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold">Assignment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Workshop *</label>
              <select
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={formData.locationId}
                onChange={(e) => handleChange('locationId', e.target.value)}
                required
              >
                <option value="">Select workshop...</option>
                <option value="l1">Main Workshop</option>
                <option value="l2">Branch Workshop</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Karigar (optional)</label>
              <select
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={formData.karigarId}
                onChange={(e) => handleChange('karigarId', e.target.value)}
              >
                <option value="">Assign later</option>
                <option value="k1">Ramesh K. (Master)</option>
                <option value="k2">Suresh M. (Senior)</option>
                <option value="k3">Dinesh P. (Junior)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer (optional)</label>
              <select
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={formData.customerId}
                onChange={(e) => handleChange('customerId', e.target.value)}
              >
                <option value="">Stock production</option>
                <option value="c1">Priya Sharma</option>
                <option value="c2">Rajesh Gupta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold">Schedule</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', Number(e.target.value))}
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={formData.estimatedStartDate}
                onChange={(e) => handleChange('estimatedStartDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={formData.estimatedEndDate}
                onChange={(e) => handleChange('estimatedEndDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold">Additional Information</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[60px]"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="General notes..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Special Instructions</label>
            <textarea
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[60px]"
              value={formData.specialInstructions}
              onChange={(e) => handleChange('specialInstructions', e.target.value)}
              placeholder="Special requirements, customer preferences..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create Job Order
          </button>
          <a
            href="/manufacturing/jobs"
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
