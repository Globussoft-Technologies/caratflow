'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import {
  Package,
  IndianRupee,
  Users,
  ShoppingCart,
  AlertTriangle,
  Factory,
  TrendingUp,
  Settings2,
  Calendar,
} from 'lucide-react';
import { DateRangePicker, ReportChart, KpiCard } from '@/features/reporting';
import type { ChartTypeEnum, AlertItem } from '@caratflow/shared-types';

// Default widget configuration -- in production, loaded from tRPC getDashboardLayout()
const DEFAULT_WIDGETS = [
  { widgetId: 'sales-today', type: 'stat', metric: 'sales_today' },
  { widgetId: 'revenue-mtd', type: 'stat', metric: 'revenue_mtd' },
  { widgetId: 'stock-items', type: 'stat', metric: 'stock_items' },
  { widgetId: 'customers', type: 'stat', metric: 'customers' },
] as const;

const MOCK_REVENUE_CHART = {
  title: 'Revenue Trend (Last 7 Days)',
  chartType: 'area' as ChartTypeEnum,
  labels: ['Mar 29', 'Mar 30', 'Mar 31', 'Apr 01', 'Apr 02', 'Apr 03', 'Apr 04'],
  datasets: [
    {
      label: 'Revenue',
      data: [520000, 480000, 690000, 550000, 720000, 430000, 610000],
      color: '#10B981',
    },
  ],
};

const MOCK_ALERTS: AlertItem[] = [
  {
    id: 'low-stock',
    severity: 'warning',
    title: '14 items below reorder level',
    description: 'Review inventory and place reorder requests.',
    timestamp: new Date().toISOString(),
    actionUrl: '/reports/inventory',
  },
  {
    id: 'overdue-jobs',
    severity: 'critical',
    title: '4 overdue manufacturing jobs',
    description: 'Jobs have exceeded estimated completion dates.',
    timestamp: new Date().toISOString(),
    actionUrl: '/reports/manufacturing',
  },
];

export default function DashboardPage() {
  const [dateRange, setDateRange] = React.useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [editMode, setEditMode] = React.useState(false);

  const formatMoney = (value: number) => {
    const rupees = value / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here is an overview of your business."
        actions={
          <div className="flex items-center gap-3">
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onChange={(from, to) => setDateRange({ from, to })}
            />
            <button
              onClick={() => setEditMode(!editMode)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-accent ${
                editMode ? 'bg-accent border-primary' : ''
              }`}
            >
              <Settings2 className="h-4 w-4" />
              {editMode ? 'Done' : 'Customize'}
            </button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value="\u20B94,52,300"
          icon={<ShoppingCart className="h-5 w-5" />}
          trend={{ value: 12.5, label: 'vs yesterday' }}
        />
        <StatCard
          title="Revenue (MTD)"
          value="\u20B938,45,000"
          icon={<IndianRupee className="h-5 w-5" />}
          trend={{ value: 8.2, label: 'vs last month' }}
        />
        <StatCard
          title="Active Stock Items"
          value="2,847"
          icon={<Package className="h-5 w-5" />}
          trend={{ value: -2.1, label: 'vs last week' }}
        />
        <StatCard
          title="Customers"
          value="1,234"
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 5.7, label: 'vs last month' }}
        />
      </div>

      {/* Charts & Data Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Revenue Trend</h3>
            <Link
              href="/reports/sales"
              className="text-sm text-primary hover:underline"
            >
              View Details
            </Link>
          </div>
          <ReportChart data={MOCK_REVENUE_CHART} height={280} formatValue={formatMoney} />
        </div>

        {/* Alerts */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Alerts</h3>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {MOCK_ALERTS.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg p-3 text-sm ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : alert.severity === 'warning'
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-blue-50 border border-blue-200 text-blue-800'
                }`}
              >
                <p className="font-medium">{alert.title}</p>
                <p className="mt-1 text-xs opacity-80">{alert.description}</p>
                {alert.actionUrl && (
                  <Link
                    href={alert.actionUrl}
                    className="mt-2 inline-block text-xs font-medium underline"
                  >
                    View Report
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Sales</h3>
            <Link
              href="/retail/sales"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { num: 'S-2026-0127', customer: 'Priya Mehta', amount: '\u20B91,25,400', time: '2h ago' },
              { num: 'S-2026-0126', customer: 'Walk-in', amount: '\u20B945,000', time: '3h ago' },
              { num: 'S-2026-0125', customer: 'Rajesh Kapoor', amount: '\u20B92,80,000', time: '5h ago' },
            ].map((sale) => (
              <div
                key={sale.num}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{sale.num}</p>
                  <p className="text-xs text-muted-foreground">{sale.customer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{sale.amount}</p>
                  <p className="text-xs text-muted-foreground">{sale.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Metal Rates</h3>
            <TrendingUp className="h-5 w-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {[
              { metal: 'Gold 24K', rate: '\u20B97,200/g', change: '+0.5%' },
              { metal: 'Gold 22K', rate: '\u20B96,600/g', change: '+0.5%' },
              { metal: 'Gold 18K', rate: '\u20B95,400/g', change: '+0.4%' },
              { metal: 'Silver 999', rate: '\u20B990/g', change: '-0.3%' },
              { metal: 'Platinum 950', rate: '\u20B93,100/g', change: '+0.1%' },
            ].map((rate) => (
              <div
                key={rate.metal}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <p className="text-sm font-medium">{rate.metal}</p>
                <div className="text-right">
                  <p className="text-sm font-semibold">{rate.rate}</p>
                  <p
                    className={`text-xs ${
                      rate.change.startsWith('+')
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {rate.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Widget selector hint (shown in edit mode) */}
      {editMode && (
        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center">
          <Settings2 className="h-8 w-8 mx-auto text-primary/50 mb-3" />
          <h3 className="text-lg font-semibold text-primary/70">Customize Your Dashboard</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Drag widgets to rearrange, or add new widgets from the widget library.
            Your layout is saved automatically per user.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              Add Widget
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
