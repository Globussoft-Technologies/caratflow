'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { AlertTriangle, Filter, Eye, ArrowUp, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

// Placeholder data -- in production, use trpc.aml.alertList hook
const alertsData = [
  {
    id: '1', customerName: 'Rajesh Enterprises', alertType: 'HIGH_VALUE', severity: 'CRITICAL',
    description: 'Transaction amount Rs. 15,00,000 exceeds limit of Rs. 10,00,000.',
    amountPaise: 1500000000, status: 'NEW', ruleName: 'High-Value Transaction Limit',
    createdAt: '2026-04-06T10:30:00',
  },
  {
    id: '2', customerName: 'Gold Palace Ltd', alertType: 'STRUCTURING', severity: 'HIGH',
    description: 'Possible structuring detected. Multiple near-threshold transactions in 24h window.',
    amountPaise: 980000000, status: 'UNDER_REVIEW', ruleName: 'Structuring Detection',
    createdAt: '2026-04-05T14:15:00',
  },
  {
    id: '3', customerName: 'Mehta Jewels Corp', alertType: 'RAPID_TRANSACTIONS', severity: 'MEDIUM',
    description: 'Customer has 8 transactions in the last 24h, exceeding limit of 5.',
    amountPaise: 450000000, status: 'NEW', ruleName: 'Transaction Frequency Limit',
    createdAt: '2026-04-04T09:00:00',
  },
  {
    id: '4', customerName: 'Diamond World Inc', alertType: 'UNUSUAL_PATTERN', severity: 'HIGH',
    description: 'Transaction amount significantly exceeds customer typical pattern.',
    amountPaise: 750000000, status: 'ESCALATED', ruleName: 'Velocity Check',
    createdAt: '2026-04-03T16:45:00',
  },
  {
    id: '5', customerName: 'Priya Sharma', alertType: 'COUNTRY_RISK', severity: 'LOW',
    description: 'Customer is from a restricted country. Enhanced due diligence required.',
    amountPaise: 50000000, status: 'CLEARED', ruleName: 'Country Restriction',
    createdAt: '2026-04-02T11:20:00',
  },
];

const severityConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
  LOW: { variant: 'info', label: 'Low' },
  MEDIUM: { variant: 'warning', label: 'Medium' },
  HIGH: { variant: 'danger', label: 'High' },
  CRITICAL: { variant: 'danger', label: 'Critical' },
};

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
  NEW: { variant: 'info', label: 'New' },
  UNDER_REVIEW: { variant: 'warning', label: 'Under Review' },
  ESCALATED: { variant: 'danger', label: 'Escalated' },
  CLEARED: { variant: 'success', label: 'Cleared' },
  REPORTED: { variant: 'muted', label: 'Reported' },
};

const alertTypeLabels: Record<string, string> = {
  HIGH_VALUE: 'High Value',
  SUSPICIOUS_TRANSACTION: 'Suspicious',
  RAPID_TRANSACTIONS: 'Rapid Transactions',
  UNUSUAL_PATTERN: 'Unusual Pattern',
  STRUCTURING: 'Structuring',
  COUNTRY_RISK: 'Country Risk',
};

export default function AmlAlertsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const filteredAlerts = alertsData.filter((alert) => {
    if (statusFilter && alert.status !== statusFilter) return false;
    if (severityFilter && alert.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AML Alerts"
        description="Review and manage Anti-Money Laundering alerts."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'AML', href: '/compliance/aml' },
          { label: 'Alerts' },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ESCALATED">Escalated</option>
            <option value="CLEARED">Cleared</option>
            <option value="REPORTED">Reported</option>
          </select>
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-4 font-medium text-muted-foreground">Customer</th>
                <th className="p-4 font-medium text-muted-foreground">Alert Type</th>
                <th className="p-4 font-medium text-muted-foreground">Severity</th>
                <th className="p-4 font-medium text-muted-foreground">Amount</th>
                <th className="p-4 font-medium text-muted-foreground">Rule</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Date</th>
                <th className="p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => {
                const sevConfig = severityConfig[alert.severity];
                const statConfig = statusConfig[alert.status];
                return (
                  <tr key={alert.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{alert.customerName}</td>
                    <td className="p-4">
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                        {alertTypeLabels[alert.alertType] ?? alert.alertType}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge label={sevConfig.label} variant={sevConfig.variant} />
                    </td>
                    <td className="p-4 text-right">
                      Rs. {(alert.amountPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-4 text-muted-foreground">{alert.ruleName}</td>
                    <td className="p-4">
                      <StatusBadge label={statConfig.label} variant={statConfig.variant} />
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {alert.status === 'NEW' && (
                          <>
                            <button
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                              title="Review"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                              title="Escalate"
                            >
                              <ArrowUp className="h-4 w-4 text-orange-500" />
                            </button>
                            <button
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                              title="Clear"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </button>
                          </>
                        )}
                        {alert.status === 'UNDER_REVIEW' && (
                          <>
                            <button
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                              title="Escalate"
                            >
                              <ArrowUp className="h-4 w-4 text-orange-500" />
                            </button>
                            <button
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                              title="Clear"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No alerts match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert Description Tooltip Area */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="text-sm font-semibold text-muted-foreground">Alert Details</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Click on an alert row to view full details, transaction history, and review workflow.
        </p>
      </div>
    </div>
  );
}
