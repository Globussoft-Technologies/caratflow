'use client';

import { PageHeader, StatCard, StatusBadge, getStatusVariant } from '@caratflow/ui';
import {
  ShoppingBag,
  IndianRupee,
  Package,
  TrendingUp,
  Store,
  ArrowRight,
  Clock,
} from 'lucide-react';

// Mock dashboard data -- in production this comes from tRPC: ecommerce.getDashboard
const dashboardData = {
  totalOnlineOrders: 28,
  onlineRevenuePaise: 2850000_00,
  pendingShipments: 7,
  pendingOrders: 4,
  channelBreakdown: [
    { channelId: '1', channelName: 'Shopify Store', channelType: 'SHOPIFY', orderCount: 18, revenuePaise: 1950000_00 },
    { channelId: '2', channelName: 'Amazon India', channelType: 'AMAZON', orderCount: 6, revenuePaise: 580000_00 },
    { channelId: '3', channelName: 'Instagram Shop', channelType: 'INSTAGRAM', orderCount: 4, revenuePaise: 320000_00 },
  ],
  conversionRate: 3.2,
  recentOrders: [
    { id: '1', orderNumber: 'ON/SHO/2604/0028', customerName: 'Meera Joshi', channelType: 'SHOPIFY', totalPaise: 125000_00, status: 'CONFIRMED', placedAt: new Date().toISOString() },
    { id: '2', orderNumber: 'ON/AMA/2604/0006', customerName: 'Vikram Singh', channelType: 'AMAZON', totalPaise: 85000_00, status: 'PROCESSING', placedAt: new Date().toISOString() },
    { id: '3', orderNumber: 'ON/SHO/2604/0027', customerName: 'Ananya Reddy', channelType: 'SHOPIFY', totalPaise: 250000_00, status: 'SHIPPED', placedAt: new Date().toISOString() },
    { id: '4', orderNumber: 'ON/INS/2604/0004', customerName: 'Pooja Gupta', channelType: 'INSTAGRAM', totalPaise: 45000_00, status: 'PENDING', placedAt: new Date().toISOString() },
    { id: '5', orderNumber: 'ON/SHO/2604/0026', customerName: null, channelType: 'SHOPIFY', totalPaise: 175000_00, status: 'DELIVERED', placedAt: new Date().toISOString() },
  ],
};

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `\u20B9${(rupees / 1000).toFixed(1)}K`;
  return `\u20B9${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

const channelIcons: Record<string, string> = {
  SHOPIFY: 'S',
  AMAZON: 'A',
  FLIPKART: 'F',
  WEBSITE: 'W',
  INSTAGRAM: 'I',
  CUSTOM: 'C',
};

export default function EcommerceDashboardPage() {
  const d = dashboardData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-Commerce & Omnichannel"
        description="Online orders, sales channels, catalog sync, and shipping management."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'E-Commerce' }]}
        actions={
          <a
            href="/ecommerce/orders"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ShoppingBag className="h-4 w-4" />
            View Orders
          </a>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Online Orders Today"
          value={String(d.totalOnlineOrders)}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <StatCard
          title="Online Revenue (Month)"
          value={formatPaise(d.onlineRevenuePaise)}
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Shipments"
          value={String(d.pendingShipments)}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          title="Conversion Rate"
          value={`${d.conversionRate}%`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Channel Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Channels</h2>
            <a href="/ecommerce/channels" className="text-xs text-primary hover:underline">Manage</a>
          </div>
          <div className="space-y-2">
            {d.channelBreakdown.map((ch) => {
              const totalRevenue = d.channelBreakdown.reduce((s, x) => s + x.revenuePaise, 0);
              const pct = totalRevenue > 0 ? (ch.revenuePaise / totalRevenue) * 100 : 0;
              return (
                <div key={ch.channelId} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                        {channelIcons[ch.channelType] ?? 'C'}
                      </span>
                      <span className="text-sm font-medium">{ch.channelName}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatPaise(ch.revenuePaise)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{ch.orderCount} orders</span>
                    <span>{pct.toFixed(0)}% of revenue</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Pending Orders', count: d.pendingOrders, href: '/ecommerce/orders?status=PENDING', icon: Clock },
              { label: 'Pending Shipments', count: d.pendingShipments, href: '/ecommerce/shipments', icon: Package },
              { label: 'Catalog Sync', count: null, href: '/ecommerce/catalog', icon: Store },
              { label: 'Product Reviews', count: null, href: '/ecommerce/reviews', icon: TrendingUp },
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
                  {item.count !== null && (
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

        {/* Recent Orders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Orders</h2>
            <a href="/ecommerce/orders" className="text-xs text-primary hover:underline">View All</a>
          </div>
          <div className="rounded-lg border divide-y">
            {d.recentOrders.map((order) => (
              <a
                key={order.id}
                href={`/ecommerce/orders/${order.id}`}
                className="flex items-center justify-between p-3 transition-colors hover:bg-accent"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">
                      {channelIcons[order.channelType] ?? 'C'}
                    </span>
                    <span className="text-sm font-medium font-mono">{order.orderNumber}</span>
                    <StatusBadge
                      label={order.status.replace('_', ' ')}
                      variant={getStatusVariant(order.status)}
                      dot={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.customerName ?? 'Guest Customer'}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatPaise(order.totalPaise)}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
