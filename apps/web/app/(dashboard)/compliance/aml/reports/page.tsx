'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { FileText, Plus, Send, CheckCircle, Eye } from 'lucide-react';
import { useState } from 'react';

// Placeholder data -- in production, use trpc.aml.sarList hook
const reportsData = [
  {
    id: '1',
    customerName: 'Rajesh Enterprises',
    reportType: 'SAR',
    filingStatus: 'DRAFT',
    alertType: 'HIGH_VALUE',
    alertSeverity: 'CRITICAL',
    description: 'High-value cash transaction exceeding CTR threshold.',
    referenceNumber: null,
    createdAt: '2026-04-06',
    filedAt: null,
  },
  {
    id: '2',
    customerName: 'Gold Palace Ltd',
    reportType: 'STR',
    filingStatus: 'FILED',
    alertType: 'STRUCTURING',
    alertSeverity: 'HIGH',
    description: 'Suspected structuring of transactions to avoid reporting threshold.',
    referenceNumber: 'FIU-2026-04-0042',
    createdAt: '2026-04-03',
    filedAt: '2026-04-05',
  },
  {
    id: '3',
    customerName: 'Diamond World Inc',
    reportType: 'CTR',
    filingStatus: 'ACKNOWLEDGED',
    alertType: 'HIGH_VALUE',
    alertSeverity: 'HIGH',
    description: 'Cash transaction above Rs. 10 Lakh threshold.',
    referenceNumber: 'FIU-2026-03-0128',
    createdAt: '2026-03-20',
    filedAt: '2026-03-22',
  },
  {
    id: '4',
    customerName: 'Mehta Jewels Corp',
    reportType: 'SAR',
    filingStatus: 'FILED',
    alertType: 'UNUSUAL_PATTERN',
    alertSeverity: 'MEDIUM',
    description: 'Unusual transaction patterns detected over 30-day period.',
    referenceNumber: 'FIU-2026-03-0095',
    createdAt: '2026-03-15',
    filedAt: '2026-03-18',
  },
];

const filingStatusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
  DRAFT: { variant: 'warning', label: 'Draft' },
  FILED: { variant: 'info', label: 'Filed' },
  ACKNOWLEDGED: { variant: 'success', label: 'Acknowledged' },
};

const reportTypeLabels: Record<string, string> = {
  SAR: 'Suspicious Activity Report',
  CTR: 'Cash Transaction Report',
  STR: 'Suspicious Transaction Report',
};

export default function AmlReportsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filtered = reportsData.filter((r) => {
    if (statusFilter && r.filingStatus !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="SAR / CTR Reports"
        description="File and manage Suspicious Activity Reports and Cash Transaction Reports."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'AML', href: '/compliance/aml' },
          { label: 'Reports' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Report
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Draft</div>
          <div className="text-2xl font-bold mt-1">
            {reportsData.filter((r) => r.filingStatus === 'DRAFT').length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Filed</div>
          <div className="text-2xl font-bold mt-1">
            {reportsData.filter((r) => r.filingStatus === 'FILED').length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Acknowledged</div>
          <div className="text-2xl font-bold mt-1">
            {reportsData.filter((r) => r.filingStatus === 'ACKNOWLEDGED').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="FILED">Filed</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-4 font-medium text-muted-foreground">Report Type</th>
                <th className="p-4 font-medium text-muted-foreground">Customer</th>
                <th className="p-4 font-medium text-muted-foreground">Alert</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Reference #</th>
                <th className="p-4 font-medium text-muted-foreground">Created</th>
                <th className="p-4 font-medium text-muted-foreground">Filed</th>
                <th className="p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => {
                const filingConfig = filingStatusConfig[report.filingStatus];
                return (
                  <tr key={report.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div>
                        <span className="font-semibold">{report.reportType}</span>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {reportTypeLabels[report.reportType]}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium">{report.customerName}</td>
                    <td className="p-4">
                      <div className="text-xs text-muted-foreground">{report.description}</div>
                    </td>
                    <td className="p-4">
                      <StatusBadge label={filingConfig.label} variant={filingConfig.variant} />
                    </td>
                    <td className="p-4">
                      {report.referenceNumber ? (
                        <span className="font-mono text-xs">{report.referenceNumber}</span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{report.createdAt}</td>
                    <td className="p-4 text-muted-foreground">
                      {report.filedAt ?? '--'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {report.filingStatus === 'DRAFT' && (
                          <button
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                            title="File Report"
                          >
                            <Send className="h-4 w-4 text-primary" />
                          </button>
                        )}
                        {report.filingStatus === 'FILED' && (
                          <button
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                            title="Mark Acknowledged"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No reports match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Note */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h4 className="text-sm font-semibold text-amber-800">Regulatory Compliance</h4>
        <p className="mt-1 text-sm text-amber-700">
          Under the Prevention of Money Laundering Act (PMLA), jewelers must report Cash Transaction
          Reports (CTR) for transactions above Rs. 10 lakh and Suspicious Transaction Reports (STR) to
          the Financial Intelligence Unit-India (FIU-IND) within the prescribed timelines.
        </p>
      </div>
    </div>
  );
}
