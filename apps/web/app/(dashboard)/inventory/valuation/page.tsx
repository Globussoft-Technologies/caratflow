'use client';

import { useState } from 'react';
import { PageHeader, DataTable } from '@caratflow/ui';
import { Calculator } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { ColumnDef } from '@caratflow/ui';

interface ValuationItemRow {
  productId: string;
  productName: string;
  sku: string;
  category: string | null;
  quantity: number;
  unitValuePaise: bigint;
  totalValuePaise: bigint;
}

interface CategoryBreakdownRow {
  categoryId: string | null;
  categoryName: string;
  totalValuePaise: bigint;
  itemCount: number;
}

export default function ValuationPage() {
  const [method, setMethod] = useState<'FIFO' | 'AVG' | 'LAST_PURCHASE' | 'GROSS_PROFIT' | 'MARKET'>('AVG');
  const [locationId, setLocationId] = useState('');
  const [runValuation, setRunValuation] = useState(false);

  const { data: valuation, isLoading } = trpc.inventory.valuation.calculate.useQuery(
    {
      method,
      locationId: locationId || undefined,
      currentRatePaise: method === 'MARKET' ? BigInt(600000) : undefined, // Placeholder rate
    },
    { enabled: runValuation },
  );

  const itemColumns: ColumnDef<ValuationItemRow, unknown>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.sku}</span>,
    },
    {
      accessorKey: 'productName',
      header: 'Product',
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => row.original.category ?? 'Uncategorized',
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
    },
    {
      accessorKey: 'unitValuePaise',
      header: 'Unit Value',
      cell: ({ row }) =>
        (Number(row.original.unitValuePaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
    },
    {
      accessorKey: 'totalValuePaise',
      header: 'Total Value',
      cell: ({ row }) =>
        (Number(row.original.totalValuePaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
    },
  ];

  const categoryColumns: ColumnDef<CategoryBreakdownRow, unknown>[] = [
    {
      accessorKey: 'categoryName',
      header: 'Category',
    },
    {
      accessorKey: 'itemCount',
      header: 'Items',
    },
    {
      accessorKey: 'totalValuePaise',
      header: 'Total Value',
      cell: ({ row }) =>
        (Number(row.original.totalValuePaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
    },
  ];

  const methods = [
    { value: 'FIFO', label: 'FIFO (First-In-First-Out)' },
    { value: 'AVG', label: 'Weighted Average Cost' },
    { value: 'LAST_PURCHASE', label: 'Last Purchase Price' },
    { value: 'GROSS_PROFIT', label: 'Gross Profit Method' },
    { value: 'MARKET', label: 'Market Value' },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Valuation"
        description="Calculate inventory value using different valuation methods."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Valuation' },
        ]}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Valuation Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            className="h-9 w-64 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {methods.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Location (optional)</label>
          <input
            type="text"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="All locations"
            className="h-9 w-64 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={() => setRunValuation(true)}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Calculator className="h-4 w-4" />
          Calculate
        </button>
      </div>

      {/* Results */}
      {valuation && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm text-muted-foreground">Total Inventory Value ({valuation.method})</div>
            <div className="mt-1 text-3xl font-bold">
              {(Number(valuation.totalValuePaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Generated at {new Date(valuation.generatedAt).toLocaleString()}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Value by Category</h3>
            <DataTable
              columns={categoryColumns}
              data={(valuation.categoryBreakdown ?? []) as CategoryBreakdownRow[]}
              pageSize={50}
            />
          </div>

          {/* Item Detail */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Item-wise Valuation</h3>
            <DataTable
              columns={itemColumns}
              data={(valuation.items ?? []) as ValuationItemRow[]}
              searchKey="productName"
              searchPlaceholder="Search products..."
              pageSize={20}
            />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Calculating valuation...
        </div>
      )}
    </div>
  );
}
