'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Search, FileText } from 'lucide-react';
import { PurchaseOrderForm } from '@/features/wholesale';

// Mock data
const mockPOs = [
  { id: '1', poNumber: 'PO/2604/0015', supplierName: 'ABC Gold Refinery', locationName: 'Main Warehouse', totalPaise: 1200000_00, status: 'SENT', expectedDate: '2026-04-15', createdAt: '2026-04-03' },
  { id: '2', poNumber: 'PO/2604/0014', supplierName: 'Silver Craft Ltd', locationName: 'Main Warehouse', totalPaise: 450000_00, status: 'PARTIALLY_RECEIVED', expectedDate: '2026-04-10', createdAt: '2026-04-02' },
  { id: '3', poNumber: 'PO/2604/0013', supplierName: 'Gem Suppliers Inc', locationName: 'Showroom', totalPaise: 780000_00, status: 'DRAFT', expectedDate: null, createdAt: '2026-04-01' },
  { id: '4', poNumber: 'PO/2604/0012', supplierName: 'Diamond Hub', locationName: 'Main Warehouse', totalPaise: 2300000_00, status: 'RECEIVED', expectedDate: '2026-03-28', createdAt: '2026-03-25' },
  { id: '5', poNumber: 'PO/2604/0011', supplierName: 'ABC Gold Refinery', locationName: 'Workshop', totalPaise: 560000_00, status: 'CANCELLED', expectedDate: '2026-03-20', createdAt: '2026-03-18' },
];

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function PurchaseOrdersPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPOs = mockPOs.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Create and manage purchase orders for suppliers."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Purchase Orders' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New PO
          </button>
        }
      />

      {showForm && (
        <PurchaseOrderForm
          onSubmit={(data) => {
            console.log('Create PO:', data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by PO number or supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-md border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* PO List */}
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>PO Number</span>
          <span>Supplier</span>
          <span>Location</span>
          <span>Total</span>
          <span>Status</span>
          <span>Expected</span>
        </div>
        <div className="divide-y">
          {filteredPOs.map((po) => (
            <a
              key={po.id}
              href={`/wholesale/purchase-orders/${po.id}`}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 text-sm transition-colors hover:bg-accent"
            >
              <span className="font-medium font-mono">{po.poNumber}</span>
              <span>{po.supplierName}</span>
              <span className="text-muted-foreground">{po.locationName}</span>
              <span className="font-semibold">{formatPaise(po.totalPaise)}</span>
              <span>
                <StatusBadge
                  label={po.status.replace(/_/g, ' ')}
                  variant={getStatusVariant(po.status)}
                  dot={false}
                />
              </span>
              <span className="text-muted-foreground">
                {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
              </span>
            </a>
          ))}
          {filteredPOs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2" />
              <p className="text-sm">No purchase orders found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
