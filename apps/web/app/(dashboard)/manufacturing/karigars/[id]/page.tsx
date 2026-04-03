'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, StatCard } from '@caratflow/ui';
import { User, Briefcase, TrendingUp, AlertTriangle } from 'lucide-react';
import { MetalBalanceLedger, AttendanceCalendar } from '@/features/manufacturing';

// Placeholder data
const KARIGAR = {
  id: 'k1',
  employeeCode: 'KRG-001',
  firstName: 'Ramesh',
  lastName: 'Kumar',
  phone: '+91 98765 43210',
  email: 'ramesh@example.com',
  specialization: 'Gold Necklaces & Chains',
  skillLevel: 'MASTER',
  dailyWagePaise: 2500_00,
  locationName: 'Main Workshop',
  isActive: true,
  joiningDate: '2018-06-15',
  address: '42, Jewellers Colony, Zaveri Bazaar, Mumbai 400002',
  performance: {
    totalJobs: 245,
    completedJobs: 230,
    completionRate: 94,
    wastagePercent: 2.3,
    avgCompletionDays: 5.2,
  },
};

const METAL_BALANCES = [
  { id: '1', metalType: 'GOLD', purityFineness: 916, issuedWeightMg: 85000, returnedWeightMg: 55000, wastedWeightMg: 2100, balanceWeightMg: 27900 },
  { id: '2', metalType: 'GOLD', purityFineness: 750, issuedWeightMg: 12000, returnedWeightMg: 10500, wastedWeightMg: 350, balanceWeightMg: 1150 },
  { id: '3', metalType: 'SILVER', purityFineness: 925, issuedWeightMg: 150000, returnedWeightMg: 140000, wastedWeightMg: 5000, balanceWeightMg: 5000 },
];

const ATTENDANCE: Array<{ date: string; status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'; overtimeMinutes?: number }> = [
  { date: '2026-04-01', status: 'PRESENT', overtimeMinutes: 60 },
  { date: '2026-04-02', status: 'PRESENT' },
  { date: '2026-04-03', status: 'PRESENT', overtimeMinutes: 30 },
  { date: '2026-04-04', status: 'PRESENT' },
];

export default function KarigarDetailPage() {
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${KARIGAR.firstName} ${KARIGAR.lastName}`}
        description={`${KARIGAR.employeeCode} | ${KARIGAR.specialization}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Karigars', href: '/manufacturing/karigars' },
          { label: `${KARIGAR.firstName} ${KARIGAR.lastName}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              label={KARIGAR.skillLevel}
              variant="success"
              dot={false}
            />
            <StatusBadge
              label={KARIGAR.isActive ? 'Active' : 'Inactive'}
              variant={KARIGAR.isActive ? 'success' : 'muted'}
            />
            <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              Edit
            </button>
          </div>
        }
      />

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Jobs"
          value={String(KARIGAR.performance.totalJobs)}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          title="Completed"
          value={String(KARIGAR.performance.completedJobs)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${KARIGAR.performance.completionRate}%`}
        />
        <StatCard
          title="Wastage"
          value={`${KARIGAR.performance.wastagePercent}%`}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Avg. Completion"
          value={`${KARIGAR.performance.avgCompletionDays} days`}
        />
      </div>

      {/* Profile Info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Contact</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{KARIGAR.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{KARIGAR.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="text-right max-w-[250px]">{KARIGAR.address}</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Employment</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span>{KARIGAR.locationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Wage</span>
              <span>Rs {(KARIGAR.dailyWagePaise / 100).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joining Date</span>
              <span>{new Date(KARIGAR.joiningDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metal Balance Ledger */}
      <MetalBalanceLedger
        balances={METAL_BALANCES}
        karigarName={`${KARIGAR.firstName} ${KARIGAR.lastName}`}
      />

      {/* Attendance Calendar */}
      <div className="rounded-lg border p-4">
        <AttendanceCalendar
          month={now.getMonth()}
          year={now.getFullYear()}
          records={ATTENDANCE}
        />
      </div>
    </div>
  );
}
