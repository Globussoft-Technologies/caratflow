'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import { ArrowLeftRight } from 'lucide-react';
import {
  DateRangePicker,
  ReportChart,
  ReportTable,
  KpiCard,
  ExportButton,
} from '@/features/reporting';
import type { ChartTypeEnum, KpiData } from '@caratflow/shared-types';

// Mock data -- in production, these come from tRPC queries
const MOCK_KPIS: KpiData[] = [
  {
    label: 'Total Revenue',
    value: 3845000,
    formattedValue: '\u20B938,45,000',
    trend: { value: 8.2, label: 'vs last month', direction: 'up' },
  },
  {
    label: 'Sales Count',
    value: 127,
    formattedValue: '127',
    trend: { value: 12.5, label: 'vs last month', direction: 'up' },
  },
  {
    label: 'Avg. Ticket Size',
    value: 30276,
    formattedValue: '\u20B930,276',
    trend: { value: -2.1, label: 'vs last month', direction: 'down' },
  },
  {
    label: 'Returns',
    value: 3,
    formattedValue: '3',
    trend: { value: 0, label: 'vs last month', direction: 'flat' },
  },
];

const MOCK_DAILY_CHART = {
  title: 'Daily Revenue',
  chartType: 'area' as ChartTypeEnum,
  labels: ['Apr 01', 'Apr 02', 'Apr 03', 'Apr 04', 'Apr 05', 'Apr 06', 'Apr 07'],
  datasets: [
    {
      label: 'Revenue',
      data: [520000, 480000, 690000, 550000, 720000, 430000, 610000],
      color: '#10B981',
    },
  ],
};

const MOCK_PRODUCT_DATA = [
  { product: 'Gold Necklace 22K', sku: 'GN-22K-001', category: 'Necklaces', qty: 15, revenue: '\u20B912,45,000' },
  { product: 'Diamond Ring 18K', sku: 'DR-18K-042', category: 'Rings', qty: 8, revenue: '\u20B98,20,000' },
  { product: 'Silver Bracelet', sku: 'SB-999-015', category: 'Bracelets', qty: 25, revenue: '\u20B91,87,500' },
  { product: 'Gold Earrings 22K', sku: 'GE-22K-087', category: 'Earrings', qty: 12, revenue: '\u20B94,80,000' },
  { product: 'Platinum Band', sku: 'PB-950-003', category: 'Rings', qty: 3, revenue: '\u20B92,10,000' },
];

type Tab = 'daily' | 'product' | 'salesperson' | 'location' | 'category';

export default function SalesReportsPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('daily');
  const [dateRange, setDateRange] = React.useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'daily', label: 'Daily Summary' },
    { key: 'product', label: 'By Product' },
    { key: 'salesperson', label: 'By Salesperson' },
    { key: 'location', label: 'By Location' },
    { key: 'category', label: 'By Category' },
  ];

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    console.log(`Exporting sales report as ${format}`);
  };

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
        title="Sales Analytics"
        description="Analyze sales performance across products, salespersons, and locations."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Sales' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/reports/sales/comparison"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Compare Periods
            </Link>
            <ExportButton onExport={handleExport} />
          </div>
        }
      />

      {/* Date Range */}
      <DateRangePicker
        from={dateRange.from}
        to={dateRange.to}
        onChange={(from, to) => setDateRange({ from, to })}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_KPIS.map((kpi) => (
          <KpiCard key={kpi.label} data={kpi} />
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
            <ReportChart data={MOCK_DAILY_CHART} formatValue={formatMoney} />
          </div>
        </div>
      )}

      {activeTab === 'product' && (
        <ReportTable
          columns={[
            { key: 'product', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'category', label: 'Category' },
            { key: 'qty', label: 'Qty Sold', align: 'right' },
            { key: 'revenue', label: 'Revenue', align: 'right' },
          ]}
          data={MOCK_PRODUCT_DATA}
          onExport={handleExport}
        />
      )}

      {activeTab === 'salesperson' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Salesperson performance data will be loaded from the API.
          Rankings by revenue, sales count, and average ticket size.
        </div>
      )}

      {activeTab === 'location' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Branch comparison data will be loaded from the API.
          Side-by-side revenue, volume, and performance metrics per location.
        </div>
      )}

      {activeTab === 'category' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Category breakdown data will be loaded from the API.
          Pie chart and table showing revenue distribution by product category.
        </div>
      )}
    </div>
  );
}
