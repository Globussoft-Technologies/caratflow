'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { RefreshCw, Eye } from 'lucide-react';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

interface CustomerRiskRow {
  id: string;
  customerId: string;
  customerName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  kycStatus: string | null;
  transactionVolumePaise: number | string | bigint;
  transactionCount: number;
  flagCount: number;
  lastAssessedAt: string | null;
  nextReviewDate: string | null;
}

const riskLevelConfig: Record<RiskLevel, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
  LOW: { variant: 'success', label: 'Low' },
  MEDIUM: { variant: 'warning', label: 'Medium' },
  HIGH: { variant: 'danger', label: 'High' },
  VERY_HIGH: { variant: 'danger', label: 'Very High' },
};

const kycStatusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
  VERIFIED: { variant: 'success', label: 'Verified' },
  PARTIAL: { variant: 'warning', label: 'Partial' },
  PENDING: { variant: 'muted', label: 'Pending' },
};

function getRiskScoreColor(score: number): string {
  if (score >= 75) return 'text-red-600';
  if (score >= 50) return 'text-orange-500';
  if (score >= 25) return 'text-amber-500';
  return 'text-green-600';
}

function getRiskBarColor(score: number): string {
  if (score >= 75) return 'bg-red-500';
  if (score >= 50) return 'bg-orange-500';
  if (score >= 25) return 'bg-amber-500';
  return 'bg-green-500';
}

function toAmountNumber(v: number | string | bigint): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AmlCustomersPage() {
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const listQuery = trpc.aml.highRiskCustomers.useQuery({ page, limit: 20 });

  const recalculateMutation = trpc.aml.customerRiskRecalculate.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Risk score recalculated.' });
      void listQuery.refetch();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const allItems = (listQuery.data?.items ?? []) as unknown as CustomerRiskRow[];
  // Client-side additional risk-level filter (backend returns HIGH + VERY_HIGH only)
  const items = filterLevel
    ? allItems.filter((c) => c.riskLevel === filterLevel)
    : allItems;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Risk Scores"
        description="View and manage high-risk customer AML assessments."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'AML', href: '/compliance/aml' },
          { label: 'Customers' },
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
      <div className="flex flex-wrap gap-3">
        <select
          value={filterLevel}
          onChange={(e) => { setFilterLevel(e.target.value); setPage(1); }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          aria-label="Filter by risk level"
        >
          <option value="">All High-Risk (HIGH + VERY HIGH)</option>
          <option value="HIGH">High only</option>
          <option value="VERY_HIGH">Very High only</option>
        </select>
      </div>

      {/* Customer Risk Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-4 font-medium text-muted-foreground">Customer</th>
                <th className="p-4 font-medium text-muted-foreground">Risk Score</th>
                <th className="p-4 font-medium text-muted-foreground">Risk Level</th>
                <th className="p-4 font-medium text-muted-foreground">KYC</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Txn Volume</th>
                <th className="p-4 font-medium text-muted-foreground">Txn Count</th>
                <th className="p-4 font-medium text-muted-foreground">Flags</th>
                <th className="p-4 font-medium text-muted-foreground">Next Review</th>
                <th className="p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Loading customer risk data...
                  </td>
                </tr>
              )}
              {listQuery.isError && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-red-600">
                    Failed to load customer risks: {listQuery.error.message}
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && !listQuery.isError && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No customers match the selected filter.
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && !listQuery.isError && items.map((customer) => {
                const riskConfig = riskLevelConfig[customer.riskLevel] ?? riskLevelConfig.MEDIUM;
                const kycConfig = customer.kycStatus
                  ? (kycStatusConfig[customer.kycStatus] ?? { variant: 'muted' as const, label: customer.kycStatus })
                  : { variant: 'muted' as const, label: 'Unknown' };
                return (
                  <tr key={customer.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{customer.customerName}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getRiskScoreColor(customer.riskScore)}`}>
                          {customer.riskScore}
                        </span>
                        <div className="h-2 w-16 rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full ${getRiskBarColor(customer.riskScore)}`}
                            style={{ width: `${Math.min(100, Math.max(0, customer.riskScore))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <StatusBadge label={riskConfig.label} variant={riskConfig.variant} />
                    </td>
                    <td className="p-4">
                      <StatusBadge label={kycConfig.label} variant={kycConfig.variant} />
                    </td>
                    <td className="p-4 text-right">
                      Rs. {(toAmountNumber(customer.transactionVolumePaise) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-4">{customer.transactionCount}</td>
                    <td className="p-4">
                      <span className={customer.flagCount > 0 ? 'font-bold text-red-500' : ''}>
                        {customer.flagCount}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {customer.nextReviewDate
                        ? new Date(customer.nextReviewDate).toLocaleDateString('en-IN')
                        : '--'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <a
                          href={`/retail/customers/${customer.customerId}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                          title="View Customer"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => recalculateMutation.mutate({ customerId: customer.customerId })}
                          disabled={recalculateMutation.isPending}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
                          title="Recalculate Risk"
                        >
                          <RefreshCw className={`h-4 w-4 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                        </button>
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
