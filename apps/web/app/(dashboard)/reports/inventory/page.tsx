'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import { Calculator } from 'lucide-react';
import { KpiCard, ReportTable, ReportChart, ExportButton } from '@/features/reporting';
import type { KpiData, ChartTypeEnum } from '@caratflow/shared-types';

const MOCK_KPIS: KpiData[] = [
  { label: 'Total Stock Value', value: 24500000, formattedValue: '\u20B92,45,00,000' },
  { label: 'Stock Items', value: 2847, formattedValue: '2,847' },
  { label: 'Low Stock Items', value: 14, formattedValue: '14', trend: { value: 3, label: 'need reorder', direction: 'up' } },
  { label: 'Dead Stock', value: 42, formattedValue: '42', trend: { value: -5, label: 'vs last month', direction: 'down' } },
];

const MOCK_CATEGORY_CHART = {
  title: 'Stock by Category',
  chartType: 'pie' as ChartTypeEnum,
  labels: ['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Chains', 'Other'],
  datasets: [
    {
      label: 'Value',
      data: [8500000, 6200000, 4100000, 2800000, 1900000, 1000000],
    },
  ],
};

const MOCK_LOW_STOCK = [
  { product: 'Gold Chain 22K 18"', sku: 'GC-22K-18', location: 'Main Store', onHand: 2, reorderLevel: 10, deficit: '8' },
  { product: 'Silver Anklet Pair', sku: 'SA-999-001', location: 'Main Store', onHand: 1, reorderLevel: 5, deficit: '4' },
  { product: 'Diamond Stud 0.5ct', sku: 'DS-05-012', location: 'Andheri Branch', onHand: 0, reorderLevel: 3, deficit: '3' },
];

const MOCK_AGING = [
  { ageRange: '0-30 days', items: '845', quantity: '1,240', value: '\u20B968,50,000' },
  { ageRange: '31-60 days', items: '620', quantity: '890', value: '\u20B952,30,000' },
  { ageRange: '61-90 days', items: '380', quantity: '520', value: '\u20B935,80,000' },
  { ageRange: '90+ days', items: '1,002', quantity: '1,560', value: '\u20B988,40,000' },
];

type Tab = 'summary' | 'lowStock' | 'deadStock' | 'movers' | 'aging';

export default function InventoryReportsPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('summary');

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'summary', label: 'Summary' },
    { key: 'lowStock', label: 'Low Stock' },
    { key: 'deadStock', label: 'Dead Stock' },
    { key: 'movers', label: 'Fast/Slow Movers' },
    { key: 'aging', label: 'Aging' },
  ];

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    console.log(`Exporting inventory report as ${format}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Analytics"
        description="Stock levels, valuation, movement analysis, and alerts."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Inventory' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/reports/inventory/valuation"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent"
            >
              <Calculator className="h-4 w-4" />
              Valuation Report
            </Link>
            <ExportButton onExport={handleExport} />
          </div>
        }
      />

      {/* KPIs */}
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

      {activeTab === 'summary' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Stock by Category</h3>
            <ReportChart data={MOCK_CATEGORY_CHART} height={300} />
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Metal Stock</h3>
            <p className="text-sm text-muted-foreground">
              Metal stock summary by type and purity will load from the API.
              Gold (24K, 22K, 18K), Silver (999), and Platinum broken down by location.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'lowStock' && (
        <ReportTable
          columns={[
            { key: 'product', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'location', label: 'Location' },
            { key: 'onHand', label: 'On Hand', align: 'right' },
            { key: 'reorderLevel', label: 'Reorder Level', align: 'right' },
            { key: 'deficit', label: 'Deficit', align: 'right' },
          ]}
          data={MOCK_LOW_STOCK}
          onExport={handleExport}
        />
      )}

      {activeTab === 'deadStock' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Dead stock items (no movement in 90+ days) will load from the API.
          Shows product, value tied up, and days since last movement.
        </div>
      )}

      {activeTab === 'movers' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Fast and slow movers by turnover rate will load from the API.
          Helps identify which products need more stock vs which are stagnant.
        </div>
      )}

      {activeTab === 'aging' && (
        <ReportTable
          columns={[
            { key: 'ageRange', label: 'Age Range' },
            { key: 'items', label: 'Items', align: 'right' },
            { key: 'quantity', label: 'Quantity', align: 'right' },
            { key: 'value', label: 'Value', align: 'right' },
          ]}
          data={MOCK_AGING}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
