'use client';

import { useState } from 'react';
import { PageHeader, FormField } from '@caratflow/ui';
import { Coins } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { MetalStockCard } from '@/features/inventory/metal-stock-card';

export default function MetalsPage() {
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustData, setAdjustData] = useState({
    metalType: 'GOLD' as 'GOLD' | 'SILVER' | 'PLATINUM',
    purityFineness: 916,
    weightChangeMg: '',
    valueChangePaise: '',
    notes: '',
  });

  // For location selection, we'd normally fetch locations via platform.locations
  // Using the metal stock query with a selected location
  const { data: metalStocks, isLoading, refetch } = trpc.inventory.metalStock.getByLocation.useQuery(
    { locationId: selectedLocationId },
    { enabled: !!selectedLocationId },
  );

  const adjustMutation = trpc.inventory.metalStock.adjust.useMutation({
    onSuccess: () => { setShowAdjustForm(false); refetch(); },
  });

  const handleAdjust = () => {
    if (!selectedLocationId) return;
    adjustMutation.mutate({
      locationId: selectedLocationId,
      metalType: adjustData.metalType,
      purityFineness: adjustData.purityFineness,
      weightChangeMg: BigInt(adjustData.weightChangeMg || '0'),
      valueChangePaise: BigInt(adjustData.valueChangePaise || '0'),
      notes: adjustData.notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metal Stock"
        description="Raw metal inventory by location and purity."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Metals' },
        ]}
        actions={
          selectedLocationId ? (
            <button
              onClick={() => setShowAdjustForm(!showAdjustForm)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Adjust Metal Stock
            </button>
          ) : null
        }
      />

      {/* Location Selector */}
      <div className="flex items-center gap-3">
        <FormField label="Location" htmlFor="location-select">
          <input
            id="location-select"
            type="text"
            placeholder="Enter location ID to view metal stock..."
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="h-9 w-96 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </FormField>
      </div>

      {/* Metal Stock Cards */}
      {selectedLocationId && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg border bg-muted" />
            ))
          ) : metalStocks && metalStocks.length > 0 ? (
            metalStocks.map((stock: {
              id: string;
              metalType: string;
              purityFineness: number;
              weightMg: bigint;
              valuePaise: bigint;
            }) => (
              <MetalStockCard
                key={stock.id}
                metalType={stock.metalType}
                purityFineness={stock.purityFineness}
                weightMg={Number(stock.weightMg)}
                valuePaise={Number(stock.valuePaise)}
              />
            ))
          ) : (
            <div className="col-span-full text-center text-muted-foreground py-8">
              No metal stock found at this location.
            </div>
          )}
        </div>
      )}

      {/* Adjust Form */}
      {showAdjustForm && (
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">Adjust Metal Stock</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Metal Type" required>
              <select
                value={adjustData.metalType}
                onChange={(e) => setAdjustData({ ...adjustData, metalType: e.target.value as 'GOLD' | 'SILVER' | 'PLATINUM' })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </FormField>
            <FormField label="Purity Fineness" required>
              <input
                type="number"
                value={adjustData.purityFineness}
                onChange={(e) => setAdjustData({ ...adjustData, purityFineness: parseInt(e.target.value) || 0 })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                min={1}
                max={999}
              />
            </FormField>
            <FormField label="Weight Change (mg)" description="Positive to add, negative to deduct" required>
              <input
                type="text"
                value={adjustData.weightChangeMg}
                onChange={(e) => setAdjustData({ ...adjustData, weightChangeMg: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="e.g. 10000 for 10g"
              />
            </FormField>
            <FormField label="Value Change (paise)" required>
              <input
                type="text"
                value={adjustData.valueChangePaise}
                onChange={(e) => setAdjustData({ ...adjustData, valueChangePaise: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="e.g. 500000 for Rs.5000"
              />
            </FormField>
            <FormField label="Notes" className="md:col-span-2">
              <textarea
                value={adjustData.notes}
                onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                rows={2}
              />
            </FormField>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdjust}
              disabled={adjustMutation.isPending}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {adjustMutation.isPending ? 'Adjusting...' : 'Apply Adjustment'}
            </button>
            <button
              onClick={() => setShowAdjustForm(false)}
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
