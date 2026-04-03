'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { ForecastChart, ReportTable, ExportButton } from '@/features/reporting';
import type { ForecastResult, SeasonalPattern } from '@caratflow/shared-types';

const MOCK_FORECAST: ForecastResult = {
  entityId: 'all',
  entityName: 'All Products',
  method: 'blended_sma_es',
  predictions: [
    { period: '2025-11', actual: 120, predicted: 120, lowerBound: 120, upperBound: 120, confidence: 1 },
    { period: '2025-12', actual: 185, predicted: 185, lowerBound: 185, upperBound: 185, confidence: 1 },
    { period: '2026-01', actual: 95, predicted: 95, lowerBound: 95, upperBound: 95, confidence: 1 },
    { period: '2026-02', actual: 110, predicted: 110, lowerBound: 110, upperBound: 110, confidence: 1 },
    { period: '2026-03', actual: 140, predicted: 140, lowerBound: 140, upperBound: 140, confidence: 1 },
    { period: '2026-04', actual: null, predicted: 135, lowerBound: 105, upperBound: 165, confidence: 0.92 },
    { period: '2026-05', actual: null, predicted: 128, lowerBound: 90, upperBound: 166, confidence: 0.84 },
    { period: '2026-06', actual: null, predicted: 131, lowerBound: 85, upperBound: 177, confidence: 0.76 },
    { period: '2026-07', actual: null, predicted: 125, lowerBound: 72, upperBound: 178, confidence: 0.68 },
    { period: '2026-08', actual: null, predicted: 130, lowerBound: 68, upperBound: 192, confidence: 0.60 },
    { period: '2026-09', actual: null, predicted: 142, lowerBound: 72, upperBound: 212, confidence: 0.52 },
  ],
  accuracy: 82.5,
  mape: 17.5,
};

const MOCK_SEASONALITY: Array<SeasonalPattern & Record<string, unknown>> = [
  { month: 1, monthName: 'January', avgDemand: 95, seasonalIndex: 0.78 },
  { month: 2, monthName: 'February', avgDemand: 110, seasonalIndex: 0.90 },
  { month: 3, monthName: 'March', avgDemand: 125, seasonalIndex: 1.02 },
  { month: 4, monthName: 'April', avgDemand: 140, seasonalIndex: 1.15 },
  { month: 5, monthName: 'May', avgDemand: 135, seasonalIndex: 1.11 },
  { month: 6, monthName: 'June', avgDemand: 105, seasonalIndex: 0.86 },
  { month: 7, monthName: 'July', avgDemand: 100, seasonalIndex: 0.82 },
  { month: 8, monthName: 'August', avgDemand: 115, seasonalIndex: 0.94 },
  { month: 9, monthName: 'September', avgDemand: 120, seasonalIndex: 0.98 },
  { month: 10, monthName: 'October', avgDemand: 160, seasonalIndex: 1.31 },
  { month: 11, monthName: 'November', avgDemand: 175, seasonalIndex: 1.43 },
  { month: 12, monthName: 'December', avgDemand: 85, seasonalIndex: 0.70 },
];

type Tab = 'forecast' | 'seasonality' | 'reorder';

export default function ForecastPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('forecast');
  const [forecastPeriods, setForecastPeriods] = React.useState(6);

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'forecast', label: 'Demand Forecast' },
    { key: 'seasonality', label: 'Seasonality' },
    { key: 'reorder', label: 'Reorder Points' },
  ];

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    console.log(`Exporting forecast report as ${format}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demand Forecasting"
        description="Sales predictions, seasonal patterns, and optimal reorder points."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Forecast' },
        ]}
        actions={<ExportButton onExport={handleExport} />}
      />

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

      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Forecast Horizon:</label>
            <select
              value={forecastPeriods}
              onChange={(e) => setForecastPeriods(Number(e.target.value))}
              className="rounded-md border px-3 py-2 text-sm bg-background"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>

          {/* Forecast Chart */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Demand Forecast - All Products</h3>
            <ForecastChart data={MOCK_FORECAST} />
          </div>
        </div>
      )}

      {activeTab === 'seasonality' && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-2">Seasonal Patterns</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Seasonal index above 1.0 indicates higher-than-average demand.
              October-November (Diwali/wedding season) shows the strongest seasonal peak.
            </p>
            <ReportTable
              columns={[
                { key: 'monthName', label: 'Month' },
                { key: 'avgDemand', label: 'Avg. Demand', align: 'right' },
                {
                  key: 'seasonalIndex',
                  label: 'Seasonal Index',
                  align: 'right',
                  render: (value) => {
                    const v = value as number;
                    const color =
                      v >= 1.2 ? 'text-green-600 font-semibold' :
                      v <= 0.8 ? 'text-red-600' : '';
                    return <span className={color}>{v.toFixed(2)}</span>;
                  },
                },
              ]}
              data={MOCK_SEASONALITY}
              onExport={handleExport}
            />
          </div>
        </div>
      )}

      {activeTab === 'reorder' && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-2">Reorder Point Calculator</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Statistical reorder point calculation based on historical demand,
            lead time, and desired service level. Select a product to calculate.
          </p>

          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Product</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm bg-background">
                <option>Select a product...</option>
                <option>Gold Chain 22K 18"</option>
                <option>Silver Anklet Pair</option>
                <option>Diamond Stud 0.5ct</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lead Time (days)</label>
              <input
                type="number"
                defaultValue={7}
                min={1}
                max={365}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Service Level</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm bg-background">
                <option value="0.90">90%</option>
                <option value="0.95">95%</option>
                <option value="0.97">97%</option>
                <option value="0.99">99%</option>
              </select>
            </div>
          </div>

          <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Calculate Reorder Point
          </button>
        </div>
      )}
    </div>
  );
}
