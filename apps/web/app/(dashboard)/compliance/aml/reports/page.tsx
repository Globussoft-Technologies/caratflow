'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Send, CheckCircle, Eye } from 'lucide-react';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';

type FilingStatus = 'DRAFT' | 'FILED' | 'ACKNOWLEDGED';

interface ReportRow {
  id: string;
  customerId: string;
  customerName: string;
  alertId: string;
  reportType: 'SAR' | 'CTR' | 'STR';
  filingStatus: FilingStatus;
  referenceNumber: string | null;
  createdAt: string;
  filedAt: string | null;
  notes: string | null;
  alert?: {
    alertType?: string;
    severity?: string;
    description?: string;
  } | null;
}

const filingStatusConfig: Record<FilingStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
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
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filePrompt, setFilePrompt] = useState<{ reportId: string } | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  const listQuery = trpc.aml.sarList.useQuery({
    page,
    limit: 20,
    filingStatus: statusFilter ? (statusFilter as FilingStatus) : undefined,
  });

  const refresh = () => { void listQuery.refetch(); };

  const fileMutation = trpc.aml.sarFile.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Report filed with FIU.' });
      setFilePrompt(null);
      setReferenceNumber('');
      refresh();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const acknowledgeMutation = trpc.aml.sarAcknowledge.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Report acknowledged.' });
      refresh();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const allItems = (listQuery.data?.items ?? []) as unknown as ReportRow[];
  const items = allItems.filter((r) => {
    if (dateFrom) {
      const ts = new Date(r.createdAt).getTime();
      const fromTs = new Date(`${dateFrom}T00:00:00`).getTime();
      if (ts < fromTs) return false;
    }
    if (dateTo) {
      const ts = new Date(r.createdAt).getTime();
      const toTs = new Date(`${dateTo}T23:59:59.999`).getTime();
      if (ts > toTs) return false;
    }
    return true;
  });

  const draftCount = allItems.filter((r) => r.filingStatus === 'DRAFT').length;
  const filedCount = allItems.filter((r) => r.filingStatus === 'FILED').length;
  const acknowledgedCount = allItems.filter((r) => r.filingStatus === 'ACKNOWLEDGED').length;

  const handleFileSubmit = () => {
    if (!filePrompt) return;
    if (!referenceNumber.trim()) {
      setBanner({ type: 'error', message: 'Reference number is required.' });
      return;
    }
    fileMutation.mutate({
      reportId: filePrompt.reportId,
      referenceNumber: referenceNumber.trim(),
    });
  };

  const anyActionPending = fileMutation.isPending || acknowledgeMutation.isPending;

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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Draft (this page)</div>
          <div className="text-2xl font-bold mt-1">{draftCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Filed (this page)</div>
          <div className="text-2xl font-bold mt-1">{filedCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Acknowledged (this page)</div>
          <div className="text-2xl font-bold mt-1">{acknowledgedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          aria-label="Filter by filing status"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="FILED">Filed</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
        </select>
        <div className="flex flex-col">
          <label htmlFor="report-date-from" className="text-xs text-muted-foreground">From</label>
          <input
            id="report-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="report-date-to" className="text-xs text-muted-foreground">To</label>
          <input
            id="report-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        {(statusFilter || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('');
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

      {/* File Prompt */}
      {filePrompt && (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h4 className="text-sm font-semibold">File Report with FIU</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter the FIU reference number to mark this report as filed.
          </p>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="FIU-2026-04-0042"
            maxLength={100}
            className="mt-2 w-full max-w-md rounded-md border px-3 py-2 text-sm"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setFilePrompt(null); setReferenceNumber(''); }}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFileSubmit}
              disabled={anyActionPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {anyActionPending ? 'Filing...' : 'Confirm File'}
            </button>
          </div>
        </div>
      )}

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
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading reports...
                  </td>
                </tr>
              )}
              {listQuery.isError && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-red-600">
                    Failed to load reports: {listQuery.error.message}
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && !listQuery.isError && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No reports match the selected filter.
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && !listQuery.isError && items.map((report) => {
                const filingConfig = filingStatusConfig[report.filingStatus] ?? filingStatusConfig.DRAFT;
                return (
                  <tr key={report.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div>
                        <span className="font-semibold">{report.reportType}</span>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {reportTypeLabels[report.reportType] ?? report.reportType}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium">{report.customerName}</td>
                    <td className="p-4">
                      <div className="text-xs text-muted-foreground">
                        {report.alert?.description ?? report.notes ?? '--'}
                      </div>
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
                    <td className="p-4 text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {report.filedAt ? new Date(report.filedAt).toLocaleDateString('en-IN') : '--'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {report.filingStatus === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => { setFilePrompt({ reportId: report.id }); setReferenceNumber(''); }}
                            disabled={anyActionPending}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
                            title="File Report"
                          >
                            <Send className="h-4 w-4 text-primary" />
                          </button>
                        )}
                        {report.filingStatus === 'FILED' && (
                          <button
                            type="button"
                            onClick={() => acknowledgeMutation.mutate({ reportId: report.id })}
                            disabled={anyActionPending}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
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
