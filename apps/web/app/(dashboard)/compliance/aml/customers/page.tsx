'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Users, RefreshCw, Eye } from 'lucide-react';
import { useState } from 'react';

// Placeholder data -- in production, use trpc.aml.highRiskCustomers hook
const customersData = [
  {
    id: '1', customerName: 'Rajesh Enterprises', riskScore: 85, riskLevel: 'VERY_HIGH',
    kycStatus: 'PARTIAL', transactionVolumePaise: 5000000000, transactionCount: 42, flagCount: 8,
    lastAssessedAt: '2026-04-06', nextReviewDate: '2026-04-13',
  },
  {
    id: '2', customerName: 'Gold Palace Ltd', riskScore: 72, riskLevel: 'HIGH',
    kycStatus: 'VERIFIED', transactionVolumePaise: 3200000000, transactionCount: 28, flagCount: 5,
    lastAssessedAt: '2026-04-05', nextReviewDate: '2026-05-05',
  },
  {
    id: '3', customerName: 'Diamond World Inc', riskScore: 68, riskLevel: 'HIGH',
    kycStatus: 'PENDING', transactionVolumePaise: 2800000000, transactionCount: 19, flagCount: 4,
    lastAssessedAt: '2026-04-04', nextReviewDate: '2026-05-04',
  },
  {
    id: '4', customerName: 'Mehta Jewels Corp', riskScore: 45, riskLevel: 'MEDIUM',
    kycStatus: 'VERIFIED', transactionVolumePaise: 1500000000, transactionCount: 15, flagCount: 2,
    lastAssessedAt: '2026-04-03', nextReviewDate: '2026-07-02',
  },
  {
    id: '5', customerName: 'Silver Star Traders', riskScore: 38, riskLevel: 'MEDIUM',
    kycStatus: 'PARTIAL', transactionVolumePaise: 800000000, transactionCount: 12, flagCount: 1,
    lastAssessedAt: '2026-04-02', nextReviewDate: '2026-07-01',
  },
  {
    id: '6', customerName: 'Priya Sharma', riskScore: 12, riskLevel: 'LOW',
    kycStatus: 'VERIFIED', transactionVolumePaise: 250000000, transactionCount: 5, flagCount: 0,
    lastAssessedAt: '2026-04-01', nextReviewDate: '2027-04-01',
  },
];

const riskLevelConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
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

export default function AmlCustomersPage() {
  const [filterLevel, setFilterLevel] = useState<string>('');

  const filtered = customersData.filter((c) => {
    if (filterLevel && c.riskLevel !== filterLevel) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Risk Scores"
        description="View and manage customer AML risk assessments."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'AML', href: '/compliance/aml' },
          { label: 'Customers' },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Risk Levels</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="VERY_HIGH">Very High</option>
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
              {filtered.map((customer) => {
                const riskConfig = riskLevelConfig[customer.riskLevel];
                const kycConfig = kycStatusConfig[customer.kycStatus];
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
                            style={{ width: `${customer.riskScore}%` }}
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
                      Rs. {(customer.transactionVolumePaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-4">{customer.transactionCount}</td>
                    <td className="p-4">
                      <span className={customer.flagCount > 0 ? 'font-bold text-red-500' : ''}>
                        {customer.flagCount}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{customer.nextReviewDate}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                          title="Recalculate Risk"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No customers match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
