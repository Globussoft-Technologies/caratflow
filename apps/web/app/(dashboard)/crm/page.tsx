'use client';

import { PageHeader, StatCard, StatusBadge, getStatusVariant } from '@caratflow/ui';
import {
  Users,
  Target,
  TrendingUp,
  Gift,
  CalendarDays,
  Star,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

// Placeholder data -- will be replaced with tRPC queries
const dashboardData = {
  newLeads: 24,
  conversionRate: 32.5,
  activeCustomers: 1234,
  loyaltyMetrics: {
    totalMembers: 856,
    pointsIssuedThisMonth: 45200,
    pointsRedeemedThisMonth: 12800,
  },
  upcomingOccasions: [
    { id: '1', customerId: 'c1', customerName: 'Priya Sharma', occasionType: 'BIRTHDAY', date: new Date(Date.now() + 2 * 86400000), daysAway: 2 },
    { id: '2', customerId: 'c2', customerName: 'Rahul Mehta', occasionType: 'ANNIVERSARY', date: new Date(Date.now() + 5 * 86400000), daysAway: 5 },
    { id: '3', customerId: 'c3', customerName: 'Anita Desai', occasionType: 'WEDDING', date: new Date(Date.now() + 7 * 86400000), daysAway: 7 },
  ],
  recentFeedback: {
    averageRating: 4.3,
    totalCount: 47,
    recent: [
      { id: 'f1', customerName: 'Suresh Kumar', rating: 5, comment: 'Excellent service and beautiful jewelry!', createdAt: new Date() },
      { id: 'f2', customerName: 'Meena Patel', rating: 4, comment: 'Good quality, prompt delivery.', createdAt: new Date(Date.now() - 86400000) },
      { id: 'f3', customerName: 'Vikram Singh', rating: 3, comment: 'Repair took longer than expected.', createdAt: new Date(Date.now() - 2 * 86400000) },
    ],
  },
  leadPipeline: { NEW: 24, CONTACTED: 18, QUALIFIED: 12, PROPOSAL: 8, NEGOTIATION: 5 },
};

function FeedbackStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export default function CrmPage() {
  const d = dashboardData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        description="Customer management, loyalty programs, leads, and marketing campaigns."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'CRM' }]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/crm/customers"
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              Customers
            </Link>
            <Link
              href="/crm/leads"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Leads
            </Link>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="New Leads"
          value={d.newLeads.toString()}
          icon={<Target className="h-5 w-5" />}
          trend={{ value: 15.3, label: 'vs last month' }}
        />
        <StatCard
          title="Conversion Rate"
          value={`${d.conversionRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{ value: 3.2, label: 'vs last month' }}
        />
        <StatCard
          title="Active Customers"
          value={d.activeCustomers.toLocaleString('en-IN')}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 5.7, label: 'vs last month' }}
        />
        <StatCard
          title="Loyalty Members"
          value={d.loyaltyMetrics.totalMembers.toLocaleString('en-IN')}
          icon={<Gift className="h-5 w-5" />}
          trend={{ value: 8.1, label: 'vs last month' }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lead Pipeline */}
        <div className="rounded-lg border bg-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Lead Pipeline</h3>
            <Link href="/crm/leads" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 flex gap-2">
            {Object.entries(d.leadPipeline).map(([status, count]) => (
              <div key={status} className="flex-1 rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="mt-1 text-xs text-muted-foreground">{status.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Loyalty Summary */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Loyalty Points</h3>
            <Link href="/crm/loyalty" className="text-sm text-primary hover:underline flex items-center gap-1">
              Manage <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Issued This Month</span>
              <span className="font-medium">{d.loyaltyMetrics.pointsIssuedThisMonth.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Redeemed This Month</span>
              <span className="font-medium">{d.loyaltyMetrics.pointsRedeemedThisMonth.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-sm font-medium">Net Points</span>
              <span className="font-bold text-emerald-600">
                +{(d.loyaltyMetrics.pointsIssuedThisMonth - d.loyaltyMetrics.pointsRedeemedThisMonth).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Occasions */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upcoming Occasions</h3>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-3">
            {d.upcomingOccasions.map((occ) => (
              <div key={occ.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Link href={`/crm/customers/${occ.customerId}`} className="font-medium hover:underline">
                    {occ.customerName}
                  </Link>
                  <p className="text-sm text-muted-foreground">{occ.occasionType.replace('_', ' ')}</p>
                </div>
                <StatusBadge
                  label={occ.daysAway === 0 ? 'Today' : `${occ.daysAway}d away`}
                  variant={occ.daysAway <= 2 ? 'danger' : occ.daysAway <= 5 ? 'warning' : 'info'}
                />
              </div>
            ))}
            {d.upcomingOccasions.length === 0 && (
              <p className="text-sm text-muted-foreground">No upcoming occasions in the next 7 days.</p>
            )}
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Recent Feedback</h3>
              <p className="text-sm text-muted-foreground">
                Avg: {d.recentFeedback.averageRating.toFixed(1)} / 5 ({d.recentFeedback.totalCount} this month)
              </p>
            </div>
            <Link href="/crm/feedback" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {d.recentFeedback.recent.map((fb) => (
              <div key={fb.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{fb.customerName}</span>
                  <FeedbackStars rating={fb.rating} />
                </div>
                {fb.comment && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{fb.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
