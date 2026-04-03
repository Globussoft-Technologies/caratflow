'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { ReportTable } from '@/features/reporting';
import { Plus, Play, Pause, Trash2, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const MOCK_SCHEDULES = [
  {
    id: '1',
    name: 'Daily Sales Summary',
    reportType: 'SALES',
    frequency: 'DAILY',
    time: '08:00',
    format: 'PDF',
    recipients: 'owner@shop.com, manager@shop.com',
    isActive: 'Active',
    lastRun: '2026-04-03 08:00',
    nextRun: '2026-04-04 08:00',
  },
  {
    id: '2',
    name: 'Weekly Inventory Report',
    reportType: 'INVENTORY',
    frequency: 'WEEKLY (Mon)',
    time: '09:00',
    format: 'XLSX',
    recipients: 'inventory@shop.com',
    isActive: 'Active',
    lastRun: '2026-03-31 09:00',
    nextRun: '2026-04-07 09:00',
  },
  {
    id: '3',
    name: 'Monthly Financial Summary',
    reportType: 'FINANCIAL',
    frequency: 'MONTHLY (1st)',
    time: '07:00',
    format: 'PDF',
    recipients: 'accounts@shop.com, owner@shop.com',
    isActive: 'Paused',
    lastRun: '2026-03-01 07:00',
    nextRun: '-',
  },
];

const MOCK_EXECUTIONS = [
  { id: '1', report: 'Daily Sales Summary', status: 'COMPLETED', startedAt: '2026-04-03 08:00:01', duration: '2.3s', rows: '127' },
  { id: '2', report: 'Weekly Inventory Report', status: 'COMPLETED', startedAt: '2026-03-31 09:00:00', duration: '4.8s', rows: '2,847' },
  { id: '3', report: 'Daily Sales Summary', status: 'FAILED', startedAt: '2026-04-02 08:00:01', duration: '0.5s', rows: '-' },
  { id: '4', report: 'Daily Sales Summary', status: 'COMPLETED', startedAt: '2026-04-01 08:00:00', duration: '2.1s', rows: '98' },
];

type Tab = 'schedules' | 'history';

export default function ScheduledReportsPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('schedules');

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'schedules', label: 'Schedules' },
    { key: 'history', label: 'Execution History' },
  ];

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'RUNNING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduled Reports"
        description="Automated report delivery via email on a schedule."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Scheduled' },
        ]}
        actions={
          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Schedule
          </button>
        }
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

      {activeTab === 'schedules' && (
        <ReportTable
          columns={[
            { key: 'name', label: 'Report Name' },
            { key: 'frequency', label: 'Frequency' },
            { key: 'time', label: 'Time' },
            { key: 'format', label: 'Format' },
            { key: 'recipients', label: 'Recipients' },
            {
              key: 'isActive',
              label: 'Status',
              render: (value) => (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    value === 'Active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {value === 'Active' ? (
                    <Play className="h-3 w-3" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                  {String(value)}
                </span>
              ),
            },
            { key: 'lastRun', label: 'Last Run' },
            { key: 'nextRun', label: 'Next Run' },
          ]}
          data={MOCK_SCHEDULES}
        />
      )}

      {activeTab === 'history' && (
        <ReportTable
          columns={[
            { key: 'report', label: 'Report' },
            {
              key: 'status',
              label: 'Status',
              render: (value) => (
                <span className="inline-flex items-center gap-1.5">
                  <StatusIcon status={String(value)} />
                  {String(value)}
                </span>
              ),
            },
            { key: 'startedAt', label: 'Started At' },
            { key: 'duration', label: 'Duration', align: 'right' },
            { key: 'rows', label: 'Rows', align: 'right' },
          ]}
          data={MOCK_EXECUTIONS}
        />
      )}
    </div>
  );
}
