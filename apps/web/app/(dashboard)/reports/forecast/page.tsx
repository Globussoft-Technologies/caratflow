'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import type { ForecastResult } from '@caratflow/shared-types';
import { trpc } from '@/lib/trpc';
import { ForecastChart } from '@/features/reporting/ForecastChart';

type Tab = 'forecast' | 'seasonality' | 'reorder';

function Sparkline({
  values,
  labels,
  height = 180,
}: {
  values: number[];
  labels?: string[];
  height?: number;
}) {
  if (!values.length) return <p className="text-sm text-muted-foreground">No data.</p>;
  const width = 640;
  const pad = 24;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const stepX = (width - pad * 2) / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (height - pad * 2) * (1 - (v - min) / range);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="max-w-full">
      <rect x={0} y={0} width={width} height={height} fill="transparent" />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
        className="text-primary"
      />
      {values.map((v, i) => {
        const x = pad + i * stepX;
        const y = pad + (height - pad * 2) * (1 - (v - min) / range);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} className="fill-primary" />
            {labels?.[i] && (
              <text
                x={x}
                y={height - 4}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ForecastReportsPage() {
  const [tab, setTab] = useState<Tab>('forecast');
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [periods, setPeriods] = useState(6);
  const [leadTimeDays, setLeadTimeDays] = useState(14);
  const [serviceLevel, setServiceLevel] = useState(0.95);
  const [years, setYears] = useState(2);

  const productsQuery = trpc.storefront.catalog.list.useQuery({
    page: 1,
    limit: 50,
    sortOrder: 'desc',
    search: productSearch || undefined,
  });
  const products =
    (
      productsQuery.data as
        | { items?: Array<{ id: string; name?: string; sku?: string }> }
        | undefined
    )?.items ?? [];

  const forecastQuery = trpc.reporting.demandForecast.useQuery(
    { productId: productId || undefined, categoryId: categoryId || undefined, periods },
    { enabled: tab === 'forecast' },
  );
  const seasonalityQuery = trpc.reporting.seasonalityAnalysis.useQuery(
    { categoryId: categoryId || undefined, years },
    { enabled: tab === 'seasonality' },
  );
  const reorderQuery = trpc.reporting.reorderPointCalculation.useQuery(
    { productId, leadTimeDays, serviceLevel },
    { enabled: tab === 'reorder' && !!productId },
  );

  const forecastResult = forecastQuery.data as ForecastResult | undefined;

  const seasonalityPoints = useMemo(() => {
    const d = seasonalityQuery.data as
      | { months?: Array<{ month?: number | string; index?: number; factor?: number }> }
      | undefined;
    const series = d?.months ?? [];
    return {
      values: series.map((p) => p.index ?? p.factor ?? 0),
      labels: series.map((p) => String(p.month ?? '')),
    };
  }, [seasonalityQuery.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecasting"
        description="Demand forecasting, seasonality analysis, and reorder point calculations."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Forecast' },
        ]}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(
          [
            { id: 'forecast', label: 'Demand Forecast' },
            { id: 'seasonality', label: 'Seasonality' },
            { id: 'reorder', label: 'Reorder Point' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl">
        <div className="space-y-2">
          <label className="text-sm font-medium">Product search</label>
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">(none)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name ?? p.sku ?? p.id}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Category ID</label>
          <input
            type="text"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="UUID (optional)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        {tab === 'forecast' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Periods</label>
            <input
              type="number"
              min={1}
              max={24}
              value={periods}
              onChange={(e) => setPeriods(Math.max(1, Math.min(24, parseInt(e.target.value) || 6)))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        )}
        {tab === 'seasonality' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Years</label>
            <input
              type="number"
              min={1}
              max={5}
              value={years}
              onChange={(e) => setYears(Math.max(1, Math.min(5, parseInt(e.target.value) || 2)))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        )}
        {tab === 'reorder' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Lead Time (days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Math.max(1, parseInt(e.target.value) || 14))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Level</label>
              <input
                type="number"
                step="0.01"
                min={0.5}
                max={0.999}
                value={serviceLevel}
                onChange={(e) => setServiceLevel(parseFloat(e.target.value) || 0.95)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        {tab === 'forecast' && (
          <>
            <h3 className="text-lg font-semibold">Demand Forecast</h3>
            {forecastQuery.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {forecastQuery.isError && (
              <p className="text-sm text-destructive">{forecastQuery.error.message}</p>
            )}
            {forecastResult != null && (
              <>
                <ForecastChart data={forecastResult} />
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Raw data</summary>
                  <pre className="mt-2 rounded-md bg-muted p-3 overflow-auto max-h-60">
                    {JSON.stringify(forecastResult, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </>
        )}

        {tab === 'seasonality' && (
          <>
            <h3 className="text-lg font-semibold">Seasonality Analysis</h3>
            {seasonalityQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
            {seasonalityQuery.isError && (
              <p className="text-sm text-destructive">{seasonalityQuery.error.message}</p>
            )}
            {seasonalityQuery.data != null && (
              <>
                <Sparkline values={seasonalityPoints.values} labels={seasonalityPoints.labels} />
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Raw data</summary>
                  <pre className="mt-2 rounded-md bg-muted p-3 overflow-auto max-h-60">
                    {JSON.stringify(seasonalityQuery.data, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </>
        )}

        {tab === 'reorder' && (
          <>
            <h3 className="text-lg font-semibold">Reorder Point Calculation</h3>
            {!productId && (
              <p className="text-sm text-muted-foreground">
                Select a product to calculate reorder point.
              </p>
            )}
            {reorderQuery.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {reorderQuery.isError && (
              <p className="text-sm text-destructive">{reorderQuery.error.message}</p>
            )}
            {reorderQuery.data != null && (
              <pre className="rounded-md bg-muted p-4 overflow-auto max-h-[60vh] text-xs">
                {JSON.stringify(reorderQuery.data, null, 2)}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
