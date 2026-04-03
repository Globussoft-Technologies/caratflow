'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { DateRangePicker, KpiCard, ReportTable, ReportChart, ExportButton } from '@/features/reporting';
import type { KpiData, ChartTypeEnum } from '@caratflow/shared-types';

const MOCK_KPIS: KpiData[] = [
  { label: 'Total Jobs', value: 48, formattedValue: '48' },
  { label: 'Completed', value: 32, formattedValue: '32', trend: { value: 14, label: 'vs last month', direction: 'up' } },
  { label: 'In Progress', value: 12, formattedValue: '12' },
  { label: 'Overdue', value: 4, formattedValue: '4', trend: { value: -20, label: 'vs last month', direction: 'down' } },
];

const MOCK_JOB_CHART = {
  title: 'Job Status Distribution',
  chartType: 'pie' as ChartTypeEnum,
  labels: ['Completed', 'In Progress', 'QC Pending', 'Overdue', 'Draft'],
  datasets: [
    { label: 'Count', data: [32, 12, 5, 4, 3] },
  ],
};

const MOCK_KARIGAR_DATA = [
  { karigar: 'Ramesh Kumar', completed: '12', wastage: '1.8%', onTime: '92%', avgDays: '4.5' },
  { karigar: 'Suresh Patel', completed: '8', wastage: '2.1%', onTime: '88%', avgDays: '5.2' },
  { karigar: 'Vikram Singh', completed: '7', wastage: '1.5%', onTime: '100%', avgDays: '3.8' },
  { karigar: 'Anil Sharma', completed: '5', wastage: '3.2%', onTime: '80%', avgDays: '6.1' },
];

const MOCK_WASTAGE_DATA = [
  { karigar: 'Anil Sharma', metal: 'Gold 22K', issued: '45.2g', wasted: '1.45g', percent: '3.2%' },
  { karigar: 'Suresh Patel', metal: 'Gold 22K', issued: '38.5g', wasted: '0.81g', percent: '2.1%' },
  { karigar: 'Ramesh Kumar', metal: 'Gold 22K', issued: '52.0g', wasted: '0.94g', percent: '1.8%' },
  { karigar: 'Vikram Singh', metal: 'Silver 999', issued: '120.0g', wasted: '1.80g', percent: '1.5%' },
];

type Tab = 'summary' | 'karigar' | 'wastage' | 'material' | 'timeline' | 'cost';

export default function ManufacturingReportsPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('summary');
  const [dateRange, setDateRange] = React.useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'summary', label: 'Job Summary' },
    { key: 'karigar', label: 'Karigar Performance' },
    { key: 'wastage', label: 'Wastage' },
    { key: 'material', label: 'Material Usage' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'cost', label: 'Cost Analysis' },
  ];

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    console.log(`Exporting manufacturing report as ${format}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing Analytics"
        description="Production performance, karigar metrics, material usage, and cost analysis."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Manufacturing' },
        ]}
        actions={<ExportButton onExport={handleExport} />}
      />

      <DateRangePicker
        from={dateRange.from}
        to={dateRange.to}
        onChange={(from, to) => setDateRange({ from, to })}
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_KPIS.map((kpi) => (
          <KpiCard key={kpi.label} data={kpi} />
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Job Status Distribution</h3>
          <ReportChart data={MOCK_JOB_CHART} height={300} />
        </div>
      )}

      {activeTab === 'karigar' && (
        <ReportTable
          columns={[
            { key: 'karigar', label: 'Karigar' },
            { key: 'completed', label: 'Jobs Completed', align: 'right' },
            { key: 'wastage', label: 'Wastage %', align: 'right' },
            { key: 'onTime', label: 'On-Time %', align: 'right' },
            { key: 'avgDays', label: 'Avg. Days', align: 'right' },
          ]}
          data={MOCK_KARIGAR_DATA}
          onExport={handleExport}
        />
      )}

      {activeTab === 'wastage' && (
        <ReportTable
          columns={[
            { key: 'karigar', label: 'Karigar' },
            { key: 'metal', label: 'Metal' },
            { key: 'issued', label: 'Issued', align: 'right' },
            { key: 'wasted', label: 'Wasted', align: 'right' },
            { key: 'percent', label: 'Wastage %', align: 'right' },
          ]}
          data={MOCK_WASTAGE_DATA}
          onExport={handleExport}
        />
      )}

      {activeTab === 'material' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Material usage report will load from the API. Shows metal issued vs returned vs wasted,
          broken down by type and purity.
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Production timeline will load from the API. Gantt-style view of planned vs actual
          job completion dates, highlighting overdue jobs.
        </div>
      )}

      {activeTab === 'cost' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Cost analysis will load from the API. Compares estimated vs actual costs per job,
          identifying cost overruns and savings.
        </div>
      )}
    </div>
  );
}
