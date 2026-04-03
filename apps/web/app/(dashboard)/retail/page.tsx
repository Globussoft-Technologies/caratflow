'use client';

import { PageHeader, StatCard, StatusBadge, getStatusVariant } from '@caratflow/ui';
import {
  ShoppingCart,
  IndianRupee,
  Receipt,
  Wrench,
  ClipboardList,
  Layers,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

// Mock dashboard data -- in production this comes from tRPC: retail.getDashboard
const dashboardData = {
  todaySalesCount: 12,
  todayRevenuePaise: 485000_00,
  averageTicketPaise: 40416_67,
  monthRevenuePaise: 12500000_00,
  pendingReturns: 2,
  activeRepairs: 8,
  activeCustomOrders: 5,
  activeLayaways: 3,
  paymentBreakdown: [
    { method: 'CASH', totalPaise: 200000_00, count: 5 },
    { method: 'CARD', totalPaise: 150000_00, count: 4 },
    { method: 'UPI', totalPaise: 100000_00, count: 6 },
    { method: 'OLD_GOLD', totalPaise: 35000_00, count: 1 },
  ],
  recentSales: [
    { id: '1', saleNumber: 'SL/MUM/2604/0012', customerName: 'Priya Sharma', totalPaise: 85000_00, status: 'COMPLETED', createdAt: new Date().toISOString() },
    { id: '2', saleNumber: 'SL/MUM/2604/0011', customerName: 'Rahul Patel', totalPaise: 125000_00, status: 'COMPLETED', createdAt: new Date().toISOString() },
    { id: '3', saleNumber: 'SL/MUM/2604/0010', customerName: null, totalPaise: 45000_00, status: 'COMPLETED', createdAt: new Date().toISOString() },
    { id: '4', saleNumber: 'SL/MUM/2604/0009', customerName: 'Anita Desai', totalPaise: 230000_00, status: 'PARTIALLY_RETURNED', createdAt: new Date().toISOString() },
  ],
};

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export default function RetailDashboardPage() {
  const d = dashboardData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retail & POS"
        description="Point of sale, sales management, repairs, and custom orders."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Retail' }]}
        actions={
          <a
            href="/retail/pos"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ShoppingCart className="h-4 w-4" />
            Open POS
          </a>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={String(d.todaySalesCount)}
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          title="Today's Revenue"
          value={formatPaise(d.todayRevenuePaise)}
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard
          title="Avg. Ticket"
          value={formatPaise(d.averageTicketPaise)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Month Revenue"
          value={formatPaise(d.monthRevenuePaise)}
          icon={<IndianRupee className="h-4 w-4" />}
        />
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Links */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Pending Returns', count: d.pendingReturns, href: '/retail/returns', icon: ClipboardList },
              { label: 'Active Repairs', count: d.activeRepairs, href: '/retail/repairs', icon: Wrench },
              { label: 'Custom Orders', count: d.activeCustomOrders, href: '/retail/custom-orders', icon: ClipboardList },
              { label: 'Active Layaways', count: d.activeLayaways, href: '/retail/layaway', icon: Layers },
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
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium">
                    {item.count}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payment Methods (Today)</h2>
          <div className="rounded-lg border p-4 space-y-3">
            {d.paymentBreakdown.map((p) => {
              const totalRevenue = d.paymentBreakdown.reduce((s, x) => s + x.totalPaise, 0);
              const pct = totalRevenue > 0 ? (p.totalPaise / totalRevenue) * 100 : 0;
              return (
                <div key={p.method}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.method}</span>
                    <span>{formatPaise(p.totalPaise)} ({p.count})</span>
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

        {/* Recent Sales */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Sales</h2>
            <a href="/retail/sales" className="text-xs text-primary hover:underline">View All</a>
          </div>
          <div className="rounded-lg border divide-y">
            {d.recentSales.map((sale) => (
              <a
                key={sale.id}
                href={`/retail/sales/${sale.id}`}
                className="flex items-center justify-between p-3 transition-colors hover:bg-accent"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium font-mono">{sale.saleNumber}</span>
                    <StatusBadge
                      label={sale.status.replace('_', ' ')}
                      variant={getStatusVariant(sale.status)}
                      dot={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sale.customerName ?? 'Walk-in Customer'}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatPaise(sale.totalPaise)}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
