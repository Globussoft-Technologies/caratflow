'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { Plus, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function NewHallmarkSubmissionPage() {
  const router = useRouter();
  const [hallmarkCenterId, setHallmarkCenterId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; declaredPurity: number }>>([
    { productId: '', declaredPurity: 916 },
  ]);

  const { data: centers } = trpc.compliance.hallmark.centers.list.useQuery({});
  const createMutation = trpc.compliance.hallmark.submissions.create.useMutation({
    onSuccess: (result) => {
      router.push(`/compliance/hallmark/${result.id}`);
    },
  });

  const addItem = () => {
    setItems((prev) => [...prev, { productId: '', declaredPurity: 916 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      hallmarkCenterId,
      locationId,
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : undefined,
      notes: notes || undefined,
      items: items.filter((i) => i.productId),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Hallmark Submission"
        description="Submit items to a BIS-authorized hallmark center for testing."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Hallmark', href: '/compliance/hallmark' },
          { label: 'New Submission' },
        ]}
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Center Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Hallmark Center *</label>
          <select
            value={hallmarkCenterId}
            onChange={(e) => setHallmarkCenterId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Select a center...</option>
            {centers?.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name} ({center.centerCode})
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Location ID *</label>
          <input
            type="text"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Enter location UUID"
            required
          />
        </div>

        {/* Expected Return Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Expected Return Date</label>
          <input
            type="date"
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Items *</label>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              Add Item
            </button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="flex items-end gap-3 rounded-md border p-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Product ID</label>
                <input
                  type="text"
                  value={item.productId}
                  onChange={(e) => updateItem(i, 'productId', e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  placeholder="Product UUID"
                  required
                />
              </div>
              <div className="w-32 space-y-1">
                <label className="text-xs text-muted-foreground">Declared Purity</label>
                <select
                  value={item.declaredPurity}
                  onChange={(e) => updateItem(i, 'declaredPurity', Number(e.target.value))}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                >
                  <option value={999}>24K (999)</option>
                  <option value={916}>22K (916)</option>
                  <option value={750}>18K (750)</option>
                  <option value={585}>14K (585)</option>
                </select>
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Submitting...' : 'Create Submission'}
        </button>

        {createMutation.isError && (
          <p className="text-sm text-destructive">
            {createMutation.error.message}
          </p>
        )}
      </form>
    </div>
  );
}
