'use client';

import { PageHeader, StatCard, StatusBadge, getStatusVariant } from '@caratflow/ui';
import {
  Globe,
  FileText,
  Ship,
  IndianRupee,
  ArrowRight,
  Shield,
  BarChart3,
  Clock,
} from 'lucide-react';

// Mock dashboard data -- in production this comes from tRPC: export.getDashboard
const dashboardData = {
  activeOrders: 8,
  pendingShipments: 3,
  totalExportValuePaise: 45000000_00,
  topDestinations: [
    { country: 'US', orderCount: 12, totalValuePaise: 18000000_00 },
    { country: 'AE', orderCount: 8, totalValuePaise: 12000000_00 },
    { country: 'GB', orderCount: 5, totalValuePaise: 8000000_00 },
    { country: 'SG', orderCount: 3, totalValuePaise: 4000000_00 },
    { country: 'HK', orderCount: 2, totalValuePaise: 3000000_00 },
  ],
  licenseUtilization: [
    { licenseNumber: 'DGFT-2025-001', licenseType: 'RODTEP', valuePaise: 5000000_00, usedValuePaise: 3200000_00, utilizationPercent: 64, status: 'ACTIVE' },
    { licenseNumber: 'DGFT-2025-002', licenseType: 'MEIS', valuePaise: 2000000_00, usedValuePaise: 1800000_00, utilizationPercent: 90, status: 'ACTIVE' },
  ],
  recentOrders: [
    { id: '1', orderNumber: 'EXP/CF/2604/0008', buyerName: 'Diamond Corp USA', buyerCountry: 'US', totalPaise: 5200000_00, status: 'SHIPPED', currencyCode: 'USD' },
    { id: '2', orderNumber: 'EXP/CF/2604/0007', buyerName: 'Al Maktoum Jewels', buyerCountry: 'AE', totalPaise: 3800000_00, status: 'CUSTOMS_CLEARED', currencyCode: 'AED' },
    { id: '3', orderNumber: 'EXP/CF/2604/0006', buyerName: 'London Gold Ltd', buyerCountry: 'GB', totalPaise: 2100000_00, status: 'CONFIRMED', currencyCode: 'GBP' },
  ],
};

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', AE: 'UAE', GB: 'United Kingdom', SG: 'Singapore', HK: 'Hong Kong',
  IN: 'India', JP: 'Japan', DE: 'Germany', FR: 'France', AU: 'Australia',
};

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10000000) return `\u20B9${(rupees / 10000000).toFixed(1)}Cr`;
  if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `\u20B9${(rupees / 1000).toFixed(1)}K`;
  return `\u20B9${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export default function ExportDashboardPage() {
  const d = dashboardData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export & International Trade"
        description="Manage export orders, invoicing, shipping documents, and compliance."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Export' }]}
        actions={
          <a
            href="/export/orders/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Globe className="h-4 w-4" />
            New Export Order
          </a>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Orders"
          value={String(d.activeOrders)}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Shipments"
          value={String(d.pendingShipments)}
          icon={<Ship className="h-4 w-4" />}
        />
        <StatCard
          title="Total Export Value"
          value={formatPaise(d.totalExportValuePaise)}
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard
          title="Top Destinations"
          value={String(d.topDestinations.length)}
          icon={<Globe className="h-4 w-4" />}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Export Orders', count: d.activeOrders, href: '/export/orders', icon: FileText },
              { label: 'Export Invoices', count: 0, href: '/export/invoices', icon: FileText },
              { label: 'Shipping Documents', count: 0, href: '/export/documents', icon: Ship },
              { label: 'Duty Calculator', count: 0, href: '/export/duty', icon: BarChart3 },
              { label: 'Exchange Rates', count: 0, href: '/export/exchange-rates', icon: IndianRupee },
              { label: 'DGFT Licenses', count: d.licenseUtilization.length, href: '/export/licenses', icon: Shield },
              { label: 'Compliance Checker', count: 0, href: '/export/compliance', icon: Shield },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count > 0 && (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium">
                      {item.count}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Top Destinations */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Top Destinations</h2>
          <div className="rounded-lg border divide-y">
            {d.topDestinations.map((dest) => (
              <div key={dest.country} className="flex items-center justify-between p-3">
                <div>
                  <span className="text-sm font-medium">{COUNTRY_NAMES[dest.country] ?? dest.country}</span>
                  <p className="text-xs text-muted-foreground">{dest.orderCount} orders</p>
                </div>
                <span className="text-sm font-semibold">{formatPaise(dest.totalValuePaise)}</span>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">License Utilization</h2>
          <div className="rounded-lg border divide-y">
            {d.licenseUtilization.map((lic) => (
              <div key={lic.licenseNumber} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium font-mono">{lic.licenseNumber}</span>
                  <span className="text-xs text-muted-foreground">{lic.licenseType}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${lic.utilizationPercent > 80 ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${lic.utilizationPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{formatPaise(lic.usedValuePaise)} used</span>
                  <span className="text-xs font-medium">{lic.utilizationPercent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Orders</h2>
            <a href="/export/orders" className="text-xs text-primary hover:underline">View All</a>
          </div>
          <div className="rounded-lg border divide-y">
            {d.recentOrders.map((order) => (
              <a
                key={order.id}
                href={`/export/orders/${order.id}`}
                className="flex items-center justify-between p-3 transition-colors hover:bg-accent"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium font-mono">{order.orderNumber}</span>
                    <StatusBadge
                      label={order.status.replace(/_/g, ' ')}
                      variant={getStatusVariant(order.status)}
                      dot={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.buyerName} ({order.buyerCountry})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatPaise(order.totalPaise)}</p>
                  <p className="text-xs text-muted-foreground">{order.currencyCode}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
