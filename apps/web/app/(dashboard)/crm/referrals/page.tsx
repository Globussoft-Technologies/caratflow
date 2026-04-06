'use client';

import { PageHeader, StatCard, StatusBadge } from '@caratflow/ui';
import {
  Users, Gift, TrendingUp, Trophy, ArrowRight,
  Share2, CheckCircle, Clock, XCircle,
} from 'lucide-react';
import Link from 'next/link';

// Placeholder data -- in production, use trpc.referral hooks
const activeProgram = {
  name: 'Refer & Earn Gold',
  referrerRewardType: 'POINTS',
  referrerRewardValue: 500,
  refereeRewardType: 'DISCOUNT_COUPON',
  refereeRewardValue: 1000,
  minOrderForRewardPaise: 500000,
  maxReferralsPerCustomer: 20,
  isActive: true,
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
};

const stats = {
  totalReferrals: 324,
  successfulReferrals: 187,
  conversionRate: 57.7,
  totalPayoutsPaise: 9350000,
};

const funnel = {
  invited: 324,
  registered: 256,
  firstOrder: 201,
  rewarded: 187,
  expired: 14,
};

const leaderboard = [
  { rank: 1, customerName: 'Priya Sharma', referralCount: 18, totalRewardsPaise: 900000 },
  { rank: 2, customerName: 'Rajesh Mehta', referralCount: 15, totalRewardsPaise: 750000 },
  { rank: 3, customerName: 'Anita Gupta', referralCount: 12, totalRewardsPaise: 600000 },
  { rank: 4, customerName: 'Vikram Singh', referralCount: 10, totalRewardsPaise: 500000 },
  { rank: 5, customerName: 'Meena Patel', referralCount: 9, totalRewardsPaise: 450000 },
];

const recentReferrals = [
  { id: '1', referrerName: 'Priya Sharma', refereeName: 'Sneha Rao', status: 'REWARDED', invitedVia: 'WHATSAPP', createdAt: '2026-04-05' },
  { id: '2', referrerName: 'Rajesh Mehta', refereeName: 'Amit Kumar', status: 'FIRST_ORDER', invitedVia: 'LINK', createdAt: '2026-04-04' },
  { id: '3', referrerName: 'Anita Gupta', refereeName: 'Ritu Jain', status: 'REGISTERED', invitedVia: 'EMAIL', createdAt: '2026-04-03' },
  { id: '4', referrerName: 'Vikram Singh', refereeName: 'Deepak Nair', status: 'INVITED', invitedVia: 'SMS', createdAt: '2026-04-02' },
  { id: '5', referrerName: 'Meena Patel', refereeName: 'Pooja Das', status: 'EXPIRED', invitedVia: 'SOCIAL', createdAt: '2026-03-15' },
];

const pendingPayouts = [
  { id: '1', customerName: 'Priya Sharma', payoutType: 'LOYALTY_POINTS', amount: 500, status: 'PENDING' },
  { id: '2', customerName: 'Sneha Rao', payoutType: 'COUPON_CODE', amount: 1000, status: 'PENDING' },
  { id: '3', customerName: 'Rajesh Mehta', payoutType: 'LOYALTY_POINTS', amount: 500, status: 'CREDITED' },
];

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
  INVITED: { variant: 'info', label: 'Invited' },
  REGISTERED: { variant: 'warning', label: 'Registered' },
  FIRST_ORDER: { variant: 'warning', label: 'First Order' },
  REWARDED: { variant: 'success', label: 'Rewarded' },
  EXPIRED: { variant: 'muted', label: 'Expired' },
};

const payoutStatusConfig: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  PENDING: { variant: 'warning', label: 'Pending' },
  CREDITED: { variant: 'success', label: 'Credited' },
  FAILED: { variant: 'danger', label: 'Failed' },
};

export default function ReferralsPage() {
  const totalFunnel = funnel.invited;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referral Program"
        description="Manage referral rewards, track conversions, and view the leaderboard."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Referrals' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Share2 className="h-4 w-4" />
            Configure Program
          </button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Referrals"
          value={stats.totalReferrals.toLocaleString('en-IN')}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Successful"
          value={stats.successfulReferrals.toLocaleString('en-IN')}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Total Payouts"
          value={`Rs. ${(stats.totalPayoutsPaise / 100).toLocaleString('en-IN')}`}
          icon={<Gift className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Program Config */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Active Program</h3>
            <StatusBadge
              label={activeProgram.isActive ? 'Active' : 'Inactive'}
              variant={activeProgram.isActive ? 'success' : 'muted'}
            />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Program Name</span>
              <span className="font-medium">{activeProgram.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referrer Reward</span>
              <span className="font-medium">{activeProgram.referrerRewardValue} {activeProgram.referrerRewardType.toLowerCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referee Reward</span>
              <span className="font-medium">Rs. {activeProgram.refereeRewardValue / 100} coupon</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Order</span>
              <span className="font-medium">Rs. {(activeProgram.minOrderForRewardPaise / 100).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Referrals</span>
              <span className="font-medium">{activeProgram.maxReferralsPerCustomer} per customer</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Period</span>
              <span className="font-medium">{activeProgram.validFrom} to {activeProgram.validTo}</span>
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Conversion Funnel</h3>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Invited', count: funnel.invited, icon: Users, color: 'bg-blue-200' },
              { label: 'Registered', count: funnel.registered, icon: CheckCircle, color: 'bg-indigo-200' },
              { label: 'First Order', count: funnel.firstOrder, icon: Gift, color: 'bg-amber-200' },
              { label: 'Rewarded', count: funnel.rewarded, icon: Trophy, color: 'bg-green-200' },
              { label: 'Expired', count: funnel.expired, icon: XCircle, color: 'bg-red-200' },
            ].map((step) => (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <step.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{step.label}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {step.count} ({totalFunnel > 0 ? Math.round((step.count / totalFunnel) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${step.color}`}
                    style={{ width: `${totalFunnel > 0 ? (step.count / totalFunnel) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold">Referral Leaderboard</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">Rank</th>
                <th className="pb-2 font-medium text-muted-foreground">Customer</th>
                <th className="pb-2 font-medium text-muted-foreground">Referrals</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Total Rewards</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.rank} className="border-b">
                  <td className="py-3">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
                      entry.rank === 2 ? 'bg-slate-100 text-slate-700' :
                      entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {entry.rank}
                    </span>
                  </td>
                  <td className="py-3 font-medium">{entry.customerName}</td>
                  <td className="py-3">{entry.referralCount}</td>
                  <td className="py-3 text-right">Rs. {(entry.totalRewardsPaise / 100).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Referrals */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Recent Referrals</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Referrer</th>
                  <th className="pb-2 font-medium text-muted-foreground">Referee</th>
                  <th className="pb-2 font-medium text-muted-foreground">Channel</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentReferrals.map((ref) => {
                  const config = statusConfig[ref.status];
                  return (
                    <tr key={ref.id} className="border-b">
                      <td className="py-3 font-medium">{ref.referrerName}</td>
                      <td className="py-3">{ref.refereeName}</td>
                      <td className="py-3">
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                          {ref.invitedVia}
                        </span>
                      </td>
                      <td className="py-3">
                        <StatusBadge label={config.label} variant={config.variant} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout Summary */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Payout Summary</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Customer</th>
                  <th className="pb-2 font-medium text-muted-foreground">Type</th>
                  <th className="pb-2 font-medium text-muted-foreground">Amount</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayouts.map((payout) => {
                  const config = payoutStatusConfig[payout.status];
                  return (
                    <tr key={payout.id} className="border-b">
                      <td className="py-3 font-medium">{payout.customerName}</td>
                      <td className="py-3">
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                          {payout.payoutType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3">{payout.amount}</td>
                      <td className="py-3">
                        <StatusBadge label={config.label} variant={config.variant} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
