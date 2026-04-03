'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, getStatusVariant, DataTable, type ColumnDef } from '@caratflow/ui';
import { FileText, Plus } from 'lucide-react';

interface BomRow {
  id: string;
  name: string;
  version: number;
  productName: string;
  status: string;
  itemCount: number;
  estimatedCostPaise: number;
  updatedAt: string;
}

const columns: ColumnDef<BomRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'BOM Name',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">v{row.original.version}</p>
      </div>
    ),
  },
  {
    accessorKey: 'productName',
    header: 'Product',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge label={row.original.status} variant={getStatusVariant(row.original.status)} />
    ),
  },
  {
    accessorKey: 'itemCount',
    header: 'Items',
  },
  {
    accessorKey: 'estimatedCostPaise',
    header: 'Est. Cost',
    cell: ({ row }) => `Rs ${(row.original.estimatedCostPaise / 100).toLocaleString('en-IN')}`,
  },
  {
    accessorKey: 'updatedAt',
    header: 'Last Updated',
    cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
  },
];

// Placeholder data
const BOMS: BomRow[] = [
  { id: '1', name: '22K Gold Necklace BOM', version: 2, productName: '22K Gold Necklace', status: 'ACTIVE', itemCount: 5, estimatedCostPaise: 350000_00, updatedAt: '2026-04-01' },
  { id: '2', name: '18K Diamond Ring BOM', version: 1, productName: '18K Diamond Ring', status: 'DRAFT', itemCount: 4, estimatedCostPaise: 125000_00, updatedAt: '2026-04-02' },
  { id: '3', name: 'Silver Temple Set BOM', version: 3, productName: 'Silver Temple Jewellery', status: 'ACTIVE', itemCount: 8, estimatedCostPaise: 45000_00, updatedAt: '2026-03-28' },
];

export default function BomListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bill of Materials"
        description="Manage BOMs for product manufacturing."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'BOM' },
        ]}
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Create BOM
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={BOMS}
        searchKey="name"
        searchPlaceholder="Search BOMs..."
        onRowClick={(row) => {
          window.location.href = `/manufacturing/bom/${row.id}`;
        }}
      />
    </div>
  );
}
