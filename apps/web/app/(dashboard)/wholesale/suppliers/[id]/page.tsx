'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Star, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { SupplierPerformanceCard } from '@/features/wholesale';

const mockSupplier = {
  supplierId: '1',
  supplierName: 'ABC Gold Refinery',
  totalOrders: 45,
  completedOrders: 42,
  onTimeDeliveryPercent: 93,
  qualityRejectionPercent: 2,
  priceCompliancePercent: 98,
  averageLeadTimeDays: 5,
  totalPurchaseValuePaise: 15000000_00,
};

const mockRateContracts = [
  { id: '1', metalType: 'GOLD', purityFineness: 916, ratePaisePer10g: 580000_00, validFrom: '2026-03-01', validTo: '2026-06-30', isActive: true },
  { id: '2', metalType: 'GOLD', purityFineness: 750, ratePaisePer10g: 475000_00, validFrom: '2026-03-01', validTo: '2026-06-30', isActive: true },
  { id: '3', metalType: 'SILVER', purityFineness: 999, ratePaisePer10g: 8500_00, validFrom: '2026-01-01', validTo: '2026-03-31', isActive: false },
];

const mockRecentPOs = [
  { id: '1', poNumber: 'PO/2604/0015', totalPaise: 1200000_00, status: 'SENT', createdAt: '2026-04-03' },
  { id: '2', poNumber: 'PO/2604/0009', totalPaise: 890000_00, status: 'RECEIVED', createdAt: '2026-03-20' },
  { id: '3', poNumber: 'PO/2603/0022', totalPaise: 2100000_00, status: 'RECEIVED', createdAt: '2026-03-10' },
];

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function SupplierDetailPage() {
  const supplier = mockSupplier;

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.supplierName}
        description="Supplier details, rate contracts, and purchase history."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Suppliers', href: '/wholesale/suppliers' },
          { label: supplier.supplierName },
        ]}
      />

      {/* Performance Card */}
      <SupplierPerformanceCard performance={supplier} />

      {/* Rate Contracts */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Rate Contracts</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Metal</span>
            <span>Purity</span>
            <span>Rate / 10g</span>
            <span>Valid From</span>
            <span>Valid To</span>
            <span>Active</span>
          </div>
          <div className="divide-y">
            {mockRateContracts.map((contract) => (
              <div
                key={contract.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 text-sm"
              >
                <span className="font-medium">{contract.metalType}</span>
                <span>{contract.purityFineness}</span>
                <span className="font-semibold">{formatPaise(contract.ratePaisePer10g)}</span>
                <span className="text-muted-foreground">
                  {new Date(contract.validFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-muted-foreground">
                  {new Date(contract.validTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span>
                  {contract.isActive ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PO History */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Purchase Orders</h2>
        <div className="rounded-lg border divide-y">
          {mockRecentPOs.map((po) => (
            <a
              key={po.id}
              href={`/wholesale/purchase-orders/${po.id}`}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium font-mono">{po.poNumber}</span>
                <StatusBadge
                  label={po.status.replace(/_/g, ' ')}
                  variant={getStatusVariant(po.status)}
                  dot={false}
                />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold">{formatPaise(po.totalPaise)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(po.createdAt).toLocaleDateString('en-IN')}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
