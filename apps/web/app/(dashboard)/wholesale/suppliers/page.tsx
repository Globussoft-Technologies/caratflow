'use client';

import { PageHeader } from '@caratflow/ui';
import { Users, Star, TrendingUp, Clock } from 'lucide-react';
import { SupplierPerformanceCard } from '@/features/wholesale';

const mockSuppliers = [
  { supplierId: '1', supplierName: 'ABC Gold Refinery', totalOrders: 45, completedOrders: 42, onTimeDeliveryPercent: 93, qualityRejectionPercent: 2, priceCompliancePercent: 98, averageLeadTimeDays: 5, totalPurchaseValuePaise: 15000000_00 },
  { supplierId: '2', supplierName: 'Silver Craft Ltd', totalOrders: 28, completedOrders: 25, onTimeDeliveryPercent: 85, qualityRejectionPercent: 5, priceCompliancePercent: 95, averageLeadTimeDays: 7, totalPurchaseValuePaise: 8500000_00 },
  { supplierId: '3', supplierName: 'Diamond Hub', totalOrders: 15, completedOrders: 14, onTimeDeliveryPercent: 100, qualityRejectionPercent: 1, priceCompliancePercent: 100, averageLeadTimeDays: 3, totalPurchaseValuePaise: 22000000_00 },
  { supplierId: '4', supplierName: 'Gem Suppliers Inc', totalOrders: 20, completedOrders: 16, onTimeDeliveryPercent: 75, qualityRejectionPercent: 8, priceCompliancePercent: 90, averageLeadTimeDays: 10, totalPurchaseValuePaise: 5200000_00 },
];

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Management"
        description="Supplier performance ratings, rate contracts, and purchase history."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Suppliers' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {mockSuppliers.map((supplier) => (
          <a key={supplier.supplierId} href={`/wholesale/suppliers/${supplier.supplierId}`}>
            <SupplierPerformanceCard performance={supplier} />
          </a>
        ))}
      </div>

      {mockSuppliers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground rounded-lg border">
          <Users className="h-8 w-8 mb-2" />
          <p className="text-sm">No suppliers found</p>
        </div>
      )}
    </div>
  );
}
