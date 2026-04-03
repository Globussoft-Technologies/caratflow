'use client';

import { PageHeader, StatCard, StatusBadge } from '@caratflow/ui';
import { Gift, TrendingUp, Users, Settings, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Placeholder data
const loyaltyProgram = {
  name: 'CaratFlow Rewards',
  pointsPerCurrencyUnit: 1,
  redemptionRate: 100,
  isActive: true,
  tiers: [
    { name: 'BRONZE', minPoints: 0, multiplier: 1, benefits: ['Basic rewards'] },
    { name: 'SILVER', minPoints: 500, multiplier: 1.25, benefits: ['Priority service', '5% bonus points'] },
    { name: 'GOLD', minPoints: 2000, multiplier: 1.5, benefits: ['Free cleaning', '10% bonus points', 'Early access'] },
    { name: 'PLATINUM', minPoints: 5000, multiplier: 2, benefits: ['Personal shopper', '15% bonus points', 'Free engraving'] },
    { name: 'DIAMOND', minPoints: 10000, multiplier: 2.5, benefits: ['All benefits', '20% bonus points', 'Exclusive events'] },
  ],
};

const stats = {
  totalMembers: 856,
  activeThisMonth: 234,
  pointsCirculation: 425000,
  avgPointsPerCustomer: 496,
};

const tierDistribution = [
  { tier: 'BRONZE', count: 320, color: 'bg-orange-200' },
  { tier: 'SILVER', count: 256, color: 'bg-slate-300' },
  { tier: 'GOLD', count: 180, color: 'bg-amber-400' },
  { tier: 'PLATINUM', count: 72, color: 'bg-blue-300' },
  { tier: 'DIAMOND', count: 28, color: 'bg-cyan-300' },
];

export default function LoyaltyPage() {
  const totalMembers = tierDistribution.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty Program"
        description="Configure loyalty programs, manage tiers, and track points."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Loyalty' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/crm/loyalty/transactions"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              Transaction Log
            </Link>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Settings className="h-4 w-4" />
              Configure
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Members" value={stats.totalMembers.toLocaleString('en-IN')} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Active This Month" value={stats.activeThisMonth.toLocaleString('en-IN')} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Points in Circulation" value={stats.pointsCirculation.toLocaleString('en-IN')} icon={<Gift className="h-5 w-5" />} />
        <StatCard title="Avg Points/Customer" value={stats.avgPointsPerCustomer.toLocaleString('en-IN')} icon={<Gift className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Program Config */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Program Configuration</h3>
            <StatusBadge label={loyaltyProgram.isActive ? 'Active' : 'Inactive'} variant={loyaltyProgram.isActive ? 'success' : 'muted'} />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Program Name</span>
              <span className="font-medium">{loyaltyProgram.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Earn Rate</span>
              <span className="font-medium">{loyaltyProgram.pointsPerCurrencyUnit} point per Rs. 100 spent</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Redemption Rate</span>
              <span className="font-medium">{loyaltyProgram.redemptionRate} points = Rs. 1</span>
            </div>
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Tier Distribution</h3>
          <div className="mt-4 space-y-3">
            {tierDistribution.map((t) => (
              <div key={t.tier} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t.tier}</span>
                  <span className="text-muted-foreground">{t.count} ({Math.round((t.count / totalMembers) * 100)}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${t.color}`}
                    style={{ width: `${(t.count / totalMembers) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tier Config */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold">Tier Configuration</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">Tier</th>
                <th className="pb-2 font-medium text-muted-foreground">Min Points</th>
                <th className="pb-2 font-medium text-muted-foreground">Multiplier</th>
                <th className="pb-2 font-medium text-muted-foreground">Benefits</th>
              </tr>
            </thead>
            <tbody>
              {loyaltyProgram.tiers.map((tier) => (
                <tr key={tier.name} className="border-b">
                  <td className="py-3 font-medium">{tier.name}</td>
                  <td className="py-3">{tier.minPoints.toLocaleString('en-IN')}</td>
                  <td className="py-3">{tier.multiplier}x</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {tier.benefits.map((b, i) => (
                        <span key={i} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                          {b}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
