'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { DateRangePicker, KpiCard, ReportTable, ReportChart, ExportButton } from '@/features/reporting';
import type { KpiData, ChartTypeEnum } from '@caratflow/shared-types';

const MOCK_KPIS: KpiData[] = [
  { label: 'Total Customers', value: 1234, formattedValue: '1,234' },
  { label: 'New This Month', value: 28, formattedValue: '28', trend: { value: 12, label: 'vs last month', direction: 'up' } },
  { label: 'Repeat Rate', value: 34, formattedValue: '34%', trend: { value: 2.5, label: 'vs last month', direction: 'up' } },
  { label: 'Avg. LTV', value: 85000, formattedValue: '\u20B985,000' },
];

const MOCK_FUNNEL_CHART = {
  title: 'Lead Funnel',
  chartType: 'bar' as ChartTypeEnum,
  labels: ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'],
  datasets: [
    { label: 'Leads', data: [45, 32, 24, 18, 12, 8], color: '#3B82F6' },
  ],
};

const MOCK_TOP_CUSTOMERS = [
  { customer: 'Priya Mehta', transactions: '24', totalSpend: '\u20B918,45,000', avgTicket: '\u20B976,875', lastPurchase: '2026-04-02' },
  { customer: 'Rajesh Kapoor', transactions: '18', totalSpend: '\u20B914,20,000', avgTicket: '\u20B978,889', lastPurchase: '2026-03-28' },
  { customer: 'Sunita Agarwal', transactions: '15', totalSpend: '\u20B911,80,000', avgTicket: '\u20B978,667', lastPurchase: '2026-04-01' },
  { customer: 'Amit Shah', transactions: '12', totalSpend: '\u20B99,60,000', avgTicket: '\u20B980,000', lastPurchase: '2026-03-15' },
];

const MOCK_LOYALTY = [
  { tier: 'Diamond', members: '12', pointsIssued: '45,000', pointsRedeemed: '18,000' },
  { tier: 'Platinum', members: '35', pointsIssued: '82,000', pointsRedeemed: '31,000' },
  { tier: 'Gold', members: '124', pointsIssued: '156,000', pointsRedeemed: '45,000' },
  { tier: 'Silver', members: '345', pointsIssued: '230,000', pointsRedeemed: '52,000' },
  { tier: 'Bronze', members: '718', pointsIssued: '180,000', pointsRedeemed: '28,000' },
];

type Tab = 'acquisition' | 'retention' | 'ltv' | 'loyalty' | 'leads' | 'campaigns';

export default function CrmReportsPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('acquisition');
  const [dateRange, setDateRange] = React.useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'acquisition', label: 'Acquisition' },
    { key: 'retention', label: 'Retention' },
    { key: 'ltv', label: 'Lifetime Value' },
    { key: 'loyalty', label: 'Loyalty' },
    { key: 'leads', label: 'Lead Funnel' },
    { key: 'campaigns', label: 'Campaigns' },
  ];

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    console.log(`Exporting CRM report as ${format}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Analytics"
        description="Customer acquisition, retention, lifetime value, and campaign performance."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'CRM' },
        ]}
        actions={<ExportButton onExport={handleExport} />}
      />

      <DateRangePicker
        from={dateRange.from}
        to={dateRange.to}
        onChange={(from, to) => setDateRange({ from, to })}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_KPIS.map((kpi) => (
          <KpiCard key={kpi.label} data={kpi} />
        ))}
      </div>

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

      {activeTab === 'acquisition' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Customer acquisition data by source (walk-in, referral, website, social, campaign)
          will load from the API. Shows monthly new customer trends.
        </div>
      )}

      {activeTab === 'retention' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Customer retention metrics will load from the API. Monthly repeat purchase rate,
          cohort analysis, and churn indicators.
        </div>
      )}

      {activeTab === 'ltv' && (
        <ReportTable
          columns={[
            { key: 'customer', label: 'Customer' },
            { key: 'transactions', label: 'Transactions', align: 'right' },
            { key: 'totalSpend', label: 'Total Spend', align: 'right' },
            { key: 'avgTicket', label: 'Avg. Ticket', align: 'right' },
            { key: 'lastPurchase', label: 'Last Purchase', align: 'right' },
          ]}
          data={MOCK_TOP_CUSTOMERS}
          onExport={handleExport}
        />
      )}

      {activeTab === 'loyalty' && (
        <ReportTable
          columns={[
            { key: 'tier', label: 'Tier' },
            { key: 'members', label: 'Members', align: 'right' },
            { key: 'pointsIssued', label: 'Points Issued', align: 'right' },
            { key: 'pointsRedeemed', label: 'Points Redeemed', align: 'right' },
          ]}
          data={MOCK_LOYALTY}
          onExport={handleExport}
        />
      )}

      {activeTab === 'leads' && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Conversion Funnel</h3>
          <ReportChart data={MOCK_FUNNEL_CHART} />
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Campaign performance data will load from the API. Delivery rates,
          open rates, and ROI by campaign.
        </div>
      )}
    </div>
  );
}
