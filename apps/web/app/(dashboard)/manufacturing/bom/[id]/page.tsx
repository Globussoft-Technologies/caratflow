'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { BomBuilder } from '@/features/manufacturing';

// Placeholder data
const BOM_DETAIL = {
  id: '1',
  name: '22K Gold Necklace BOM',
  version: 2,
  productName: '22K Gold Necklace',
  status: 'ACTIVE',
  outputQuantity: 1,
  estimatedCostPaise: 350000_00,
  estimatedTimeMins: 480,
  notes: 'Standard necklace design with 3 stone settings.',
  items: [
    { id: '1', itemType: 'METAL', description: '22K Gold Wire', quantityRequired: 1, unitOfMeasure: 'g', weightMg: 25000, estimatedCostPaise: 150000_00, wastagePercent: 300, sortOrder: 0 },
    { id: '2', itemType: 'METAL', description: '22K Gold Sheet', quantityRequired: 1, unitOfMeasure: 'g', weightMg: 10000, estimatedCostPaise: 60000_00, wastagePercent: 500, sortOrder: 1 },
    { id: '3', itemType: 'STONE', description: 'Ruby 0.5ct Round', quantityRequired: 3, unitOfMeasure: 'pcs', weightMg: 300, estimatedCostPaise: 45000_00, wastagePercent: 0, sortOrder: 2 },
    { id: '4', itemType: 'FINDING', description: 'Lobster Clasp 22K', quantityRequired: 1, unitOfMeasure: 'pcs', weightMg: 1500, estimatedCostPaise: 5000_00, wastagePercent: 0, sortOrder: 3 },
    { id: '5', itemType: 'LABOR', description: 'Making charges', quantityRequired: 8, unitOfMeasure: 'hrs', weightMg: null, estimatedCostPaise: 90000_00, wastagePercent: 0, sortOrder: 4 },
  ],
};

export default function BomDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={BOM_DETAIL.name}
        description={`Version ${BOM_DETAIL.version} | Output: ${BOM_DETAIL.productName}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'BOM', href: '/manufacturing/bom' },
          { label: BOM_DETAIL.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge label={BOM_DETAIL.status} variant={getStatusVariant(BOM_DETAIL.status)} />
            <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              Clone
            </button>
            <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Edit
            </button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Output Quantity</p>
          <p className="text-xl font-bold">{BOM_DETAIL.outputQuantity}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Estimated Cost</p>
          <p className="text-xl font-bold">
            Rs {(BOM_DETAIL.estimatedCostPaise / 100).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Estimated Time</p>
          <p className="text-xl font-bold">
            {Math.floor(BOM_DETAIL.estimatedTimeMins / 60)}h {BOM_DETAIL.estimatedTimeMins % 60}m
          </p>
        </div>
      </div>

      {/* Notes */}
      {BOM_DETAIL.notes && (
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{BOM_DETAIL.notes}</p>
        </div>
      )}

      {/* Material Breakdown */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Material Breakdown</h2>
        <BomBuilder items={BOM_DETAIL.items} onChange={() => {}} readOnly />
      </div>
    </div>
  );
}
