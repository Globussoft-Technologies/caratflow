'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { JobPriority } from '@caratflow/shared-types';

type Priority = JobPriority;

export default function NewJobOrderPage() {
  const router = useRouter();

  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [assignedKarigarId, setAssignedKarigarId] = useState('');
  const [bomId, setBomId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [priority, setPriority] = useState<Priority>(JobPriority.MEDIUM);
  const [quantity, setQuantity] = useState<number>(1);
  const [estimatedStartDate, setEstimatedStartDate] = useState('');
  const [estimatedEndDate, setEstimatedEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Products via storefront catalog list
  const productsQuery = trpc.storefront.catalog.list.useQuery({
    page: 1,
    limit: 50,
    sortOrder: 'desc',
    search: productSearch || undefined,
  });

  // Karigars via manufacturing.karigar.list
  const karigarsQuery = trpc.manufacturing.karigar.list.useQuery({
    pagination: { page: 1, limit: 100, sortOrder: 'desc' },
  });

  // Locations via platform.branches.list
  const branchesQuery = trpc.platform.branches.list.useQuery({ includeInactive: false });

  const createMutation = trpc.manufacturing.job.create.useMutation({
    onSuccess: (result: unknown) => {
      const id = (result as { id?: string } | null)?.id;
      if (id) {
        router.push(`/manufacturing/jobs/${id}`);
      } else {
        router.push('/manufacturing/jobs');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      productId,
      locationId,
      bomId: bomId || undefined,
      customerId: customerId || undefined,
      assignedKarigarId: assignedKarigarId || undefined,
      priority,
      quantity,
      estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : undefined,
      estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : undefined,
      notes: notes || undefined,
      specialInstructions: specialInstructions || undefined,
    });
  };

  const products = ((productsQuery.data as { items?: Array<{ id: string; name?: string; sku?: string }> } | undefined)?.items) ?? [];
  const karigars = ((karigarsQuery.data as { data?: Array<{ id: string; name?: string; fullName?: string }> } | undefined)?.data) ?? [];
  const branches = (branchesQuery.data as Array<{ id: string; name: string }> | undefined) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Job Order"
        description="Create a new manufacturing job order."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Jobs', href: '/manufacturing/jobs' },
          { label: 'New' },
        ]}
      />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium">Product *</label>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? p.sku ?? p.id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Location *</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a location...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assigned Karigar</label>
            <select
              value={assignedKarigarId}
              onChange={(e) => setAssignedKarigarId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {karigars.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.fullName ?? k.name ?? k.id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value={JobPriority.LOW}>Low</option>
              <option value={JobPriority.MEDIUM}>Medium</option>
              <option value={JobPriority.HIGH}>High</option>
              <option value={JobPriority.URGENT}>Urgent</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity *</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estimated Start</label>
            <input
              type="date"
              value={estimatedStartDate}
              onChange={(e) => setEstimatedStartDate(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estimated End</label>
            <input
              type="date"
              value={estimatedEndDate}
              onChange={(e) => setEstimatedEndDate(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">BOM ID (optional)</label>
            <input
              type="text"
              value={bomId}
              onChange={(e) => setBomId(e.target.value)}
              placeholder="UUID"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Customer ID (optional)</label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="UUID"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Special Instructions</label>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending || !productId || !locationId}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Job Order'}
          </button>
          {createMutation.isSuccess && (
            <p className="text-sm text-green-600">Created successfully.</p>
          )}
        </div>

        {createMutation.isError && (
          <p className="text-sm text-destructive">{createMutation.error.message}</p>
        )}
      </form>
    </div>
  );
}
