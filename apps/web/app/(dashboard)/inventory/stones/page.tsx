'use client';

import { useState } from 'react';
import { PageHeader, FormField } from '@caratflow/ui';
import { Diamond, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { StoneStockCard } from '@/features/inventory/stone-stock-card';

export default function StonesPage() {
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    stoneType: '',
    shape: '',
    sizeRange: '',
    color: '',
    clarity: '',
    cutGrade: '',
    totalWeightCt: 0,
    totalPieces: 0,
    valuePaise: '',
    certificationNumber: '',
  });

  const { data: stoneStocks, isLoading, refetch } = trpc.inventory.stoneStock.getByLocation.useQuery(
    { locationId: selectedLocationId },
    { enabled: !!selectedLocationId },
  );

  const createMutation = trpc.inventory.stoneStock.create.useMutation({
    onSuccess: () => { setShowCreateForm(false); refetch(); },
  });

  const handleCreate = () => {
    if (!selectedLocationId || !formData.stoneType) return;
    createMutation.mutate({
      locationId: selectedLocationId,
      stoneType: formData.stoneType,
      shape: formData.shape || undefined,
      sizeRange: formData.sizeRange || undefined,
      color: formData.color || undefined,
      clarity: formData.clarity || undefined,
      cutGrade: formData.cutGrade || undefined,
      totalWeightCt: formData.totalWeightCt,
      totalPieces: formData.totalPieces,
      valuePaise: BigInt(formData.valuePaise || '0'),
      certificationNumber: formData.certificationNumber || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stone Stock"
        description="Loose stone inventory with 4Cs grading."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Stones' },
        ]}
        actions={
          selectedLocationId ? (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Stone Stock
            </button>
          ) : null
        }
      />

      {/* Location Selector */}
      <div className="flex items-center gap-3">
        <FormField label="Location" htmlFor="stone-location">
          <input
            id="stone-location"
            type="text"
            placeholder="Enter location ID..."
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="h-9 w-96 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </FormField>
      </div>

      {/* Stone Stock Cards */}
      {selectedLocationId && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted" />
            ))
          ) : stoneStocks && stoneStocks.length > 0 ? (
            stoneStocks.map((stone: {
              id: string;
              stoneType: string;
              shape: string | null;
              color: string | null;
              clarity: string | null;
              cutGrade: string | null;
              sizeRange: string | null;
              totalWeightCt: number;
              totalPieces: number;
              valuePaise: bigint;
              certificationNumber: string | null;
            }) => (
              <StoneStockCard
                key={stone.id}
                stoneType={stone.stoneType}
                shape={stone.shape}
                color={stone.color}
                clarity={stone.clarity}
                cutGrade={stone.cutGrade}
                sizeRange={stone.sizeRange}
                totalWeightCt={stone.totalWeightCt}
                totalPieces={stone.totalPieces}
                valuePaise={Number(stone.valuePaise)}
                certificationNumber={stone.certificationNumber}
              />
            ))
          ) : (
            <div className="col-span-full text-center text-muted-foreground py-8">
              No stone stock found at this location.
            </div>
          )}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">Add Stone Stock</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Stone Type" required>
              <input
                type="text"
                value={formData.stoneType}
                onChange={(e) => setFormData({ ...formData, stoneType: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="e.g. Diamond, Ruby, Emerald"
              />
            </FormField>
            <FormField label="Shape">
              <input
                type="text"
                value={formData.shape}
                onChange={(e) => setFormData({ ...formData, shape: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="e.g. Round, Princess, Oval"
              />
            </FormField>
            <FormField label="Size Range">
              <input
                type="text"
                value={formData.sizeRange}
                onChange={(e) => setFormData({ ...formData, sizeRange: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="e.g. 0.5-1.0ct"
              />
            </FormField>
            <FormField label="Color">
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="e.g. D, E, F"
              />
            </FormField>
            <FormField label="Clarity">
              <input
                type="text"
                value={formData.clarity}
                onChange={(e) => setFormData({ ...formData, clarity: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="e.g. VVS1, VS2"
              />
            </FormField>
            <FormField label="Cut Grade">
              <input
                type="text"
                value={formData.cutGrade}
                onChange={(e) => setFormData({ ...formData, cutGrade: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="e.g. Excellent, Very Good"
              />
            </FormField>
            <FormField label="Total Weight (centesimal carats)" required>
              <input
                type="number"
                value={formData.totalWeightCt}
                onChange={(e) => setFormData({ ...formData, totalWeightCt: parseInt(e.target.value) || 0 })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                min={0}
              />
            </FormField>
            <FormField label="Total Pieces" required>
              <input
                type="number"
                value={formData.totalPieces}
                onChange={(e) => setFormData({ ...formData, totalPieces: parseInt(e.target.value) || 0 })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                min={0}
              />
            </FormField>
            <FormField label="Value (paise)" required>
              <input
                type="text"
                value={formData.valuePaise}
                onChange={(e) => setFormData({ ...formData, valuePaise: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </FormField>
            <FormField label="Certification Number">
              <input
                type="text"
                value={formData.certificationNumber}
                onChange={(e) => setFormData({ ...formData, certificationNumber: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </FormField>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Add Stone Stock'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="h-9 rounded-md border px-4 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
