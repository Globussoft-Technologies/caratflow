'use client';

import { PageHeader, StatCard, StatusBadge } from '@caratflow/ui';
import {
  Shield, AlertTriangle, Eye, Users, FileText,
  TrendingUp, ArrowRight, Settings,
} from 'lucide-react';
import Link from 'next/link';

// Placeholder data -- in production, use trpc.aml.dashboard hook
const dashboardData = {
  alertsByStatus: { NEW: 12, UNDER_REVIEW: 8, ESCALATED: 3, CLEARED: 45, REPORTED: 2 },
  alertsBySeverity: { LOW: 18, MEDIUM: 24, HIGH: 15, CRITICAL: 5 },
  pendingReviews: 20,
  riskDistribution: { LOW: 580, MEDIUM: 120, HIGH: 35, VERY_HIGH: 8 },
  recentHighValueTransactions: [
    { customerId: '1', customerName: 'Rajesh Enterprises', amountPaise: 1500000000, date: '2026-04-06' },
    { customerId: '2', customerName: 'Mehta Jewels Corp', amountPaise: 1200000000, date: '2026-04-05' },
    { customerId: '3', customerName: 'Gold Palace Ltd', amountPaise: 980000000, date: '2026-04-04' },
    { customerId: '4', customerName: 'Diamond World Inc', amountPaise: 750000000, date: '2026-04-03' },
  ],
  alertsTrend: [
    { date: '2026-03-28', count: 3 },
    { date: '2026-03-29', count: 5 },
    { date: '2026-03-30', count: 2 },
    { date: '2026-03-31', count: 4 },
    { date: '2026-04-01', count: 6 },
    { date: '2026-04-02', count: 3 },
    { date: '2026-04-03', count: 7 },
    { date: '2026-04-04', count: 4 },
    { date: '2026-04-05', count: 5 },
    { date: '2026-04-06', count: 8 },
  ],
};

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

export default function AmlDashboardPage() {
  const totalCustomers = Object.values(dashboardData.riskDistribution).reduce((a, b) => a + b, 0);
  const maxTrend = Math.max(...dashboardData.alertsTrend.map((t) => t.count));

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
          value={dashboardData.pendingReviews.toString()}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          title="New Alerts"
          value={dashboardData.alertsByStatus.NEW.toString()}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Escalated"
          value={dashboardData.alertsByStatus.ESCALATED.toString()}
          icon={<Shield className="h-5 w-5" />}
        />
        <StatCard
          title="High-Risk Customers"
          value={(dashboardData.riskDistribution.HIGH + dashboardData.riskDistribution.VERY_HIGH).toString()}
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
            {Object.entries(dashboardData.alertsBySeverity).map(([severity, count]) => (
              <div
                key={severity}
                className={`rounded-lg p-4 ${severityColors[severity]}`}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm font-medium mt-1">{severity}</div>
              </div>
            ))}
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
            {Object.entries(dashboardData.riskDistribution).map(([level, count]) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Trend */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold">Alert Trend (Last 10 Days)</h3>
        <div className="mt-4 flex items-end gap-2" style={{ height: 120 }}>
          {dashboardData.alertsTrend.map((day) => (
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
      </div>

      {/* Recent High-Value Transactions */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold">Recent High-Value Transactions</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">Customer</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Amount</th>
                <th className="pb-2 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.recentHighValueTransactions.map((txn) => (
                <tr key={txn.customerId} className="border-b">
                  <td className="py-3 font-medium">{txn.customerName}</td>
                  <td className="py-3 text-right">
                    Rs. {(txn.amountPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 text-muted-foreground">{txn.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
