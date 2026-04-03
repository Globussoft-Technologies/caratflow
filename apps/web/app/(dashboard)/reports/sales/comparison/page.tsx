'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { DateRangePicker, PeriodComparison, ReportChart, ExportButton } from '@/features/reporting';
import type { ChartTypeEnum } from '@caratflow/shared-types';

export default function SalesComparisonPage() {
  const now = new Date();
  const [period1, setPeriod1] = React.useState({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: now,
  });
  const [period2, setPeriod2] = React.useState({
    from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    to: new Date(now.getFullYear(), now.getMonth(), 0),
  });

  const comparisonMetrics = [
    { label: 'Total Revenue', period1Value: '\u20B938,45,000', period2Value: '\u20B935,20,000', changePercent: 9.23 },
    { label: 'Sales Count', period1Value: '127', period2Value: '113', changePercent: 12.39 },
    { label: 'Average Ticket', period1Value: '\u20B930,276', period2Value: '\u20B931,150', changePercent: -2.81 },
    { label: 'Returns', period1Value: '3', period2Value: '5', changePercent: -40.0 },
    { label: 'Net Revenue', period1Value: '\u20B937,95,000', period2Value: '\u20B934,70,000', changePercent: 9.37 },
  ];

  const comparisonChart = {
    title: 'Revenue Comparison',
    chartType: 'bar' as ChartTypeEnum,
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      { label: 'Current Period', data: [850000, 920000, 1050000, 1025000], color: '#10B981' },
      { label: 'Previous Period', data: [780000, 850000, 970000, 920000], color: '#94A3B8' },
    ],
  };

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    console.log(`Exporting comparison report as ${format}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Comparison"
        description="Compare sales performance across two periods side-by-side."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Sales', href: '/reports/sales' },
          { label: 'Comparison' },
        ]}
        actions={<ExportButton onExport={handleExport} />}
      />

      {/* Period Selectors */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Period 1 (Current)
          </label>
          <DateRangePicker
            from={period1.from}
            to={period1.to}
            onChange={(from, to) => setPeriod1({ from, to })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Period 2 (Previous)
          </label>
          <DateRangePicker
            from={period2.from}
            to={period2.to}
            onChange={(from, to) => setPeriod2({ from, to })}
          />
        </div>
      </div>

      {/* Comparison Metrics */}
      <PeriodComparison
        period1Label="Current"
        period2Label="Previous"
        metrics={comparisonMetrics}
      />

      {/* Comparison Chart */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Weekly Revenue Comparison</h3>
        <ReportChart data={comparisonChart} />
      </div>
    </div>
  );
}
