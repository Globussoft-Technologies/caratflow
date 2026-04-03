'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { KpiCard, ReportTable, ExportButton } from '@/features/reporting';
import type { KpiData } from '@caratflow/shared-types';

const MOCK_KPIS: KpiData[] = [
  { label: 'Total Cost Value', value: 24500000, formattedValue: '\u20B92,45,00,000' },
  { label: 'Total Market Value', value: 29800000, formattedValue: '\u20B92,98,00,000' },
  { label: 'Unrealized Gain', value: 5300000, formattedValue: '\u20B953,00,000' },
  { label: 'Items Valued', value: 2847, formattedValue: '2,847' },
];

const MOCK_VALUATION = [
  { product: 'Gold Necklace 22K', sku: 'GN-22K-001', qty: '15', costValue: '\u20B912,45,000', marketValue: '\u20B914,85,000' },
  { product: 'Diamond Ring 18K', sku: 'DR-18K-042', qty: '8', costValue: '\u20B98,20,000', marketValue: '\u20B99,60,000' },
  { product: 'Silver Bracelet', sku: 'SB-999-015', qty: '25', costValue: '\u20B91,87,500', marketValue: '\u20B92,12,500' },
  { product: 'Gold Earrings 22K', sku: 'GE-22K-087', qty: '12', costValue: '\u20B94,80,000', marketValue: '\u20B95,76,000' },
];

export default function ValuationReportPage() {
  const [method, setMethod] = React.useState<'cost' | 'market'>('cost');

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    console.log(`Exporting valuation report (${method}) as ${format}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Valuation Report"
        description="View stock valuation by cost or market value method."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Inventory', href: '/reports/inventory' },
          { label: 'Valuation' },
        ]}
        actions={<ExportButton onExport={handleExport} />}
      />

      {/* Method Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Valuation Method:</label>
        <div className="flex rounded-md border">
          <button
            onClick={() => setMethod('cost')}
            className={`px-4 py-2 text-sm ${
              method === 'cost'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            } rounded-l-md`}
          >
            Cost Price
          </button>
          <button
            onClick={() => setMethod('market')}
            className={`px-4 py-2 text-sm ${
              method === 'market'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            } rounded-r-md`}
          >
            Market Price
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_KPIS.map((kpi) => (
          <KpiCard key={kpi.label} data={kpi} />
        ))}
      </div>

      {/* Valuation Table */}
      <ReportTable
        columns={[
          { key: 'product', label: 'Product' },
          { key: 'sku', label: 'SKU' },
          { key: 'qty', label: 'Quantity', align: 'right' },
          { key: 'costValue', label: 'Cost Value', align: 'right' },
          { key: 'marketValue', label: 'Market Value', align: 'right' },
        ]}
        data={MOCK_VALUATION}
        onExport={handleExport}
      />
    </div>
  );
}
