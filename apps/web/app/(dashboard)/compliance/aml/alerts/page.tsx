'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Filter, Eye, ArrowUp, CheckCircle, Send } from 'lucide-react';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';

type AlertStatus = 'NEW' | 'UNDER_REVIEW' | 'ESCALATED' | 'CLEARED' | 'REPORTED';
type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface AlertRow {
  id: string;
  customerId: string;
  customerName: string;
  alertType: string;
  severity: AlertSeverity;
  status: AlertStatus;
  description: string;
  amountPaise: number | string | bigint;
  createdAt: string;
  rule?: { ruleName: string; ruleType: string } | null;
}

const severityConfig: Record<AlertSeverity, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
  LOW: { variant: 'info', label: 'Low' },
  MEDIUM: { variant: 'warning', label: 'Medium' },
  HIGH: { variant: 'danger', label: 'High' },
  CRITICAL: { variant: 'danger', label: 'Critical' },
};

const statusConfig: Record<AlertStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
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

function toAmountNumber(v: number | string | bigint): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function matchesDateRange(createdAtIso: string, fromDate: string, toDate: string): boolean {
  if (!fromDate && !toDate) return true;
  const ts = new Date(createdAtIso).getTime();
  if (fromDate) {
    const fromTs = new Date(`${fromDate}T00:00:00`).getTime();
    if (ts < fromTs) return false;
  }
  if (toDate) {
    const toTs = new Date(`${toDate}T23:59:59.999`).getTime();
    if (ts > toTs) return false;
  }
  return true;
}

export default function AmlAlertsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionPrompt, setActionPrompt] = useState<{
    alertId: string;
    action: 'review' | 'escalate' | 'clear';
  } | null>(null);
  const [actionNotes, setActionNotes] = useState<string>('');

  const listQuery = trpc.aml.alertList.useQuery({
    page,
    limit: 20,
    status: statusFilter ? (statusFilter as AlertStatus) : undefined,
    severity: severityFilter ? (severityFilter as AlertSeverity) : undefined,
  });

  const refresh = () => {
    void listQuery.refetch();
  };

  const reviewMutation = trpc.aml.alertReview.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Alert marked as under review.' });
      setActionPrompt(null);
      setActionNotes('');
      refresh();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const escalateMutation = trpc.aml.alertEscalate.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Alert escalated.' });
      setActionPrompt(null);
      setActionNotes('');
      refresh();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const clearMutation = trpc.aml.alertClear.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Alert cleared (false positive).' });
      setActionPrompt(null);
      setActionNotes('');
      refresh();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const reportMutation = trpc.aml.alertReportToFiu.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Alert reported to FIU.' });
      refresh();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const dataItems = (listQuery.data?.items ?? []) as unknown as AlertRow[];
  // Client-side date-range filter (backend listAlerts has no date inputs yet)
  const items = dataItems.filter((a) => matchesDateRange(a.createdAt, dateFrom, dateTo));

  const handleSubmitAction = () => {
    if (!actionPrompt) return;
    const { alertId, action } = actionPrompt;
    if (action === 'review') {
      reviewMutation.mutate({ alertId, notes: actionNotes.trim() || undefined });
    } else if (action === 'escalate') {
      escalateMutation.mutate({ alertId, notes: actionNotes.trim() || undefined });
    } else if (action === 'clear') {
      if (!actionNotes.trim()) {
        setBanner({ type: 'error', message: 'Notes are required when clearing an alert.' });
        return;
      }
      clearMutation.mutate({ alertId, notes: actionNotes.trim() });
    }
  };

  const anyActionPending =
    reviewMutation.isPending ||
    escalateMutation.isPending ||
    clearMutation.isPending ||
    reportMutation.isPending;

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

      {banner && (
        <div
          className={`rounded-md border p-3 text-sm ${
            banner.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            aria-label="Filter by status"
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
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          aria-label="Filter by severity"
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <div className="flex flex-col">
          <label htmlFor="alert-date-from" className="text-xs text-muted-foreground">From</label>
          <input
            id="alert-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="alert-date-to" className="text-xs text-muted-foreground">To</label>
          <input
            id="alert-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        {(statusFilter || severityFilter || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('');
              setSeverityFilter('');
              setDateFrom('');
              setDateTo('');
              setPage(1);
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm hover:bg-accent"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Action Notes Dialog */}
      {actionPrompt && (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h4 className="text-sm font-semibold">
            {actionPrompt.action === 'review' && 'Mark as Under Review'}
            {actionPrompt.action === 'escalate' && 'Escalate Alert'}
            {actionPrompt.action === 'clear' && 'Clear Alert (False Positive)'}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {actionPrompt.action === 'clear'
              ? 'Notes are required when clearing an alert.'
              : 'Notes are optional.'}
          </p>
          <textarea
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Add review notes..."
            className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setActionPrompt(null); setActionNotes(''); }}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitAction}
              disabled={anyActionPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {anyActionPending ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

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
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading alerts...
                  </td>
                </tr>
              )}
              {listQuery.isError && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-red-600">
                    Failed to load alerts: {listQuery.error.message}
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && !listQuery.isError && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No alerts match the selected filters.
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && !listQuery.isError && items.map((alert) => {
                const sevConfig = severityConfig[alert.severity] ?? severityConfig.MEDIUM;
                const statConfig = statusConfig[alert.status] ?? statusConfig.NEW;
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
                      Rs. {(toAmountNumber(alert.amountPaise) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-4 text-muted-foreground">{alert.rule?.ruleName ?? '--'}</td>
                    <td className="p-4">
                      <StatusBadge label={statConfig.label} variant={statConfig.variant} />
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {alert.status === 'NEW' && (
                          <button
                            type="button"
                            onClick={() => { setActionPrompt({ alertId: alert.id, action: 'review' }); setActionNotes(''); }}
                            disabled={anyActionPending}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
                            title="Review"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {(alert.status === 'NEW' || alert.status === 'UNDER_REVIEW') && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setActionPrompt({ alertId: alert.id, action: 'escalate' }); setActionNotes(''); }}
                              disabled={anyActionPending}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
                              title="Escalate"
                            >
                              <ArrowUp className="h-4 w-4 text-orange-500" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setActionPrompt({ alertId: alert.id, action: 'clear' }); setActionNotes(''); }}
                              disabled={anyActionPending}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
                              title="Clear (false positive)"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </button>
                          </>
                        )}
                        {alert.status === 'ESCALATED' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Report this alert to FIU? This cannot be undone.')) {
                                reportMutation.mutate({ alertId: alert.id });
                              }
                            }}
                            disabled={anyActionPending}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
                            title="Report to FIU"
                          >
                            <Send className="h-4 w-4 text-primary" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {listQuery.data && (
        <PaginationControls
          page={listQuery.data.page}
          totalPages={listQuery.data.totalPages}
          hasPrevious={listQuery.data.hasPrevious}
          hasNext={listQuery.data.hasNext}
          onChange={setPage}
        />
      )}
    </div>
  );
}
