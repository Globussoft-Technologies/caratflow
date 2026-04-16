'use client';

import { PageHeader, StatCard } from '@caratflow/ui';
import {
  Shield, AlertTriangle, Eye, Users, FileText,
  ArrowRight, Settings,
} from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

interface AlertsByStatus {
  NEW?: number; UNDER_REVIEW?: number; ESCALATED?: number; CLEARED?: number; REPORTED?: number;
}
interface AlertsBySeverity {
  LOW?: number; MEDIUM?: number; HIGH?: number; CRITICAL?: number;
}
interface RiskDistribution {
  LOW?: number; MEDIUM?: number; HIGH?: number; VERY_HIGH?: number;
}
interface RecentTxn {
  customerId: string;
  customerName: string;
  amountPaise: number | string;
  date: string;
}
interface TrendPoint { date: string; count: number }
interface DashboardData {
  alertsByStatus: AlertsByStatus;
  alertsBySeverity: AlertsBySeverity;
  pendingReviews: number;
  riskDistribution: RiskDistribution;
  recentHighValueTransactions: RecentTxn[];
  alertsTrend: TrendPoint[];
}

const severityColors: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const riskColors: Record<string, string> = {
  LOW: 'bg-green-200',
  MEDIUM: 'bg-amber-200',
  HIGH: 'bg-orange-300',
  VERY_HIGH: 'bg-red-300',
};

const SEVERITY_ORDER: Array<keyof AlertsBySeverity> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const RISK_ORDER: Array<keyof RiskDistribution> = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];

function toAmountNumber(v: number | string | bigint): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AmlDashboardPage() {
  const dashboardQuery = trpc.aml.dashboard.useQuery();
  const data = dashboardQuery.data as DashboardData | undefined;

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AML Compliance"
          description="Anti-Money Laundering monitoring, alerts, risk scoring, and reporting."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Compliance', href: '/compliance' },
            { label: 'AML' },
          ]}
        />
        <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AML Compliance"
          description="Anti-Money Laundering monitoring, alerts, risk scoring, and reporting."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Compliance', href: '/compliance' },
            { label: 'AML' },
          ]}
        />
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load dashboard: {dashboardQuery.error.message}
        </div>
      </div>
    );
  }

  const alertsByStatus = (data?.alertsByStatus ?? {}) as AlertsByStatus;
  const alertsBySeverity = (data?.alertsBySeverity ?? {}) as AlertsBySeverity;
  const riskDistribution = (data?.riskDistribution ?? {}) as RiskDistribution;
  const pendingReviews = data?.pendingReviews ?? 0;
  const recentTxns = data?.recentHighValueTransactions ?? [];
  const alertsTrend = data?.alertsTrend ?? [];

  const totalCustomers = RISK_ORDER.reduce((acc, level) => acc + (riskDistribution[level] ?? 0), 0);
  const maxTrend = alertsTrend.length > 0 ? Math.max(...alertsTrend.map((t) => t.count)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AML Compliance"
        description="Anti-Money Laundering monitoring, alerts, risk scoring, and reporting."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'AML' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/compliance/aml/rules"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              Rules
            </Link>
            <Link
              href="/compliance/aml/reports"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <FileText className="h-4 w-4" />
              SAR Reports
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Reviews"
          value={pendingReviews.toString()}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          title="New Alerts"
          value={(alertsByStatus.NEW ?? 0).toString()}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Escalated"
          value={(alertsByStatus.ESCALATED ?? 0).toString()}
          icon={<Shield className="h-5 w-5" />}
        />
        <StatCard
          title="High-Risk Customers"
          value={((riskDistribution.HIGH ?? 0) + (riskDistribution.VERY_HIGH ?? 0)).toString()}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerts by Severity */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Alerts by Severity</h3>
            <Link href="/compliance/aml/alerts" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {SEVERITY_ORDER.map((severity) => {
              const count = alertsBySeverity[severity] ?? 0;
              return (
                <div
                  key={severity}
                  className={`rounded-lg p-4 ${severityColors[severity]}`}
                >
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm font-medium mt-1">{severity}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Risk Distribution */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Customer Risk Distribution</h3>
            <Link href="/compliance/aml/customers" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {RISK_ORDER.map((level) => {
              const count = riskDistribution[level] ?? 0;
              return (
                <div key={level} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{level.replace('_', ' ')}</span>
                    <span className="text-muted-foreground">
                      {count} ({totalCustomers > 0 ? Math.round((count / totalCustomers) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${riskColors[level]}`}
                      style={{ width: `${totalCustomers > 0 ? (count / totalCustomers) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts Trend */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold">Alert Trend (Last 30 Days)</h3>
        {alertsTrend.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No alerts in the last 30 days.</p>
        ) : (
          <div className="mt-4 flex items-end gap-2" style={{ height: 120 }}>
            {alertsTrend.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{day.count}</span>
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${maxTrend > 0 ? (day.count / maxTrend) * 80 : 0}px` }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent High-Value Transactions */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold">Recent High-Value Alerts</h3>
        <div className="mt-4 overflow-x-auto">
          {recentTxns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent high-value alerts.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Customer</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Amount</th>
                  <th className="pb-2 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((txn) => (
                  <tr key={`${txn.customerId}-${txn.date}`} className="border-b">
                    <td className="py-3 font-medium">{txn.customerName}</td>
                    <td className="py-3 text-right">
                      Rs. {(toAmountNumber(txn.amountPaise) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(txn.date).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { href: '/compliance/aml/alerts', icon: AlertTriangle, label: 'Alert Management' },
          { href: '/compliance/aml/rules', icon: Settings, label: 'AML Rules' },
          { href: '/compliance/aml/customers', icon: Users, label: 'Customer Risk' },
          { href: '/compliance/aml/reports', icon: FileText, label: 'SAR Reports' },
          { href: '/compliance', icon: Shield, label: 'Back to Compliance' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-accent"
          >
            <item.icon className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
