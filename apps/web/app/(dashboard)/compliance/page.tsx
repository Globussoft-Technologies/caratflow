'use client';

import { PageHeader, StatCard } from '@caratflow/ui';
import {
  Shield, ShieldCheck, FileText, Award, Umbrella, ClipboardList,
  Search, Plus, ArrowRight,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { CoverageGauge, ExpiryAlert, AuditFindingsTable } from '@/features/compliance';

export default function ComplianceDashboardPage() {
  const { data: dashboard, isLoading } = trpc.compliance.dashboard.get.useQuery();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="HUID registry, hallmarking, certifications, and regulatory compliance."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Compliance' }]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/compliance/huid"
              className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              <Search className="h-4 w-4" />
              HUID Registry
            </Link>
            <Link
              href="/compliance/hallmark/new"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Hallmark Submission
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="HUID Coverage"
          value={dashboard ? `${dashboard.huidCoveragePercent.toFixed(1)}%` : '---'}
          icon={<ShieldCheck className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Hallmarks"
          value={dashboard?.pendingHallmarks?.toString() ?? '0'}
          icon={<Shield className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Expiring Documents"
          value={dashboard?.expiringDocs?.toString() ?? '0'}
          icon={<FileText className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Certified Stones"
          value={dashboard ? `${dashboard.certifiedStonesPercent.toFixed(1)}%` : '---'}
          icon={<Award className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Insurance Coverage"
          value={
            dashboard?.insuranceCoverage
              ? `${(dashboard.insuranceCoverage / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`
              : '---'
          }
          icon={<Umbrella className="h-5 w-5" />}
          isLoading={isLoading}
        />
      </div>

      {/* Expiry alerts */}
      {dashboard && dashboard.expiringDocs > 0 && (
        <ExpiryAlert count={dashboard.expiringDocs} />
      )}

      {/* Coverage Gauges */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-4">Coverage Overview</h3>
          <div className="flex items-center justify-around">
            <CoverageGauge
              percent={dashboard?.huidCoveragePercent ?? 0}
              label="HUID Coverage"
            />
            <CoverageGauge
              percent={dashboard?.certifiedStonesPercent ?? 0}
              label="Certified Stones"
            />
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Upcoming Audits</h3>
            <Link href="/compliance/audits" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <AuditFindingsTable audits={dashboard?.upcomingAudits ?? []} />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { href: '/compliance/huid', icon: ShieldCheck, label: 'HUID Registry' },
          { href: '/compliance/hallmark', icon: Shield, label: 'Hallmark' },
          { href: '/compliance/certificates', icon: Award, label: 'Certificates' },
          { href: '/compliance/traceability', icon: Search, label: 'Traceability' },
          { href: '/compliance/documents', icon: FileText, label: 'Documents' },
          { href: '/compliance/insurance', icon: Umbrella, label: 'Insurance' },
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
