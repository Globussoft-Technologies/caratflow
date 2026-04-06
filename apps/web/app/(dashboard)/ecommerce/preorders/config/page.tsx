'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Search, Plus, Settings, Trash2, Edit2 } from 'lucide-react';

// Mock data -- in production from tRPC: preorder.listConfigs
const configs = [
  { id: '1', productId: 'prod-1', productName: '22K Gold Necklace Set', productSku: 'GN-22K-001', isPreOrderEnabled: true, isBackorderEnabled: false, maxPreOrderQty: 10, depositPercentage: 20, estimatedLeadDays: 14, autoConfirm: false, customMessage: 'Available in 2 weeks. 20% deposit required.' },
  { id: '2', productId: 'prod-2', productName: 'Diamond Solitaire Ring', productSku: 'DR-18K-001', isPreOrderEnabled: true, isBackorderEnabled: true, maxPreOrderQty: 5, depositPercentage: 25, estimatedLeadDays: 21, autoConfirm: false, customMessage: null },
  { id: '3', productId: 'prod-3', productName: 'Platinum Wedding Bands', productSku: 'PB-PT-001', isPreOrderEnabled: false, isBackorderEnabled: true, maxPreOrderQty: 20, depositPercentage: 0, estimatedLeadDays: 7, autoConfirm: true, customMessage: 'Back in stock soon!' },
  { id: '4', productId: 'prod-4', productName: 'Ruby Stud Earrings', productSku: 'RE-22K-003', isPreOrderEnabled: true, isBackorderEnabled: true, maxPreOrderQty: 15, depositPercentage: 10, estimatedLeadDays: 10, autoConfirm: true, customMessage: null },
  { id: '5', productId: 'prod-5', productName: '18K Gold Chain', productSku: 'GC-18K-002', isPreOrderEnabled: false, isBackorderEnabled: false, maxPreOrderQty: 0, depositPercentage: 0, estimatedLeadDays: 14, autoConfirm: false, customMessage: null },
];

export default function PreOrderConfigPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pre-Order Configuration"
        description="Configure pre-order and backorder settings per product."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Pre-Orders', href: '/ecommerce/preorders' },
          { label: 'Configuration' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          className="h-10 w-full rounded-md border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Config Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Product</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Pre-Order</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Backorder</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Max Qty</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Deposit %</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Lead Days</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Auto-Confirm</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {configs.map((config) => (
              <tr key={config.id} className="transition-colors hover:bg-accent/50">
                <td className="p-3">
                  <div>
                    <p className="text-sm font-medium">{config.productName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{config.productSku}</p>
                  </div>
                </td>
                <td className="p-3">
                  <StatusBadge
                    label={config.isPreOrderEnabled ? 'Enabled' : 'Disabled'}
                    variant={config.isPreOrderEnabled ? 'success' : 'default'}
                    dot
                  />
                </td>
                <td className="p-3">
                  <StatusBadge
                    label={config.isBackorderEnabled ? 'Enabled' : 'Disabled'}
                    variant={config.isBackorderEnabled ? 'success' : 'default'}
                    dot
                  />
                </td>
                <td className="p-3">
                  <span className="text-sm">{config.maxPreOrderQty || '--'}</span>
                </td>
                <td className="p-3">
                  <span className="text-sm">{config.depositPercentage > 0 ? `${config.depositPercentage}%` : '--'}</span>
                </td>
                <td className="p-3">
                  <span className="text-sm">{config.estimatedLeadDays} days</span>
                </td>
                <td className="p-3">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    config.autoConfirm ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {config.autoConfirm ? '\u2713' : '\u2717'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button className="inline-flex h-7 items-center rounded border px-2 text-xs font-medium hover:bg-accent" title="Edit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button className="inline-flex h-7 items-center rounded border border-destructive/30 px-2 text-xs font-medium hover:bg-destructive/10" title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom Message Preview */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          Products with Custom Messages
        </h2>
        <div className="space-y-2">
          {configs.filter((c) => c.customMessage).map((config) => (
            <div key={config.id} className="flex items-start gap-3 rounded-md bg-muted/30 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{config.productName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{config.customMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h2 className="text-sm font-semibold mb-3">Bulk Actions</h2>
        <div className="flex items-center gap-3">
          <button className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent">
            Enable Pre-Order for Selected
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent">
            Enable Backorder for Selected
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/30 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
            Disable All Selected
          </button>
        </div>
      </div>
    </div>
  );
}
