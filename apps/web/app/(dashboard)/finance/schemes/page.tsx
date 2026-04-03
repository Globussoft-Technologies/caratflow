'use client';

import * as React from 'react';
import { PageHeader, StatCard } from '@caratflow/ui';
import { Users, IndianRupee, Coins, Gift, Calendar } from 'lucide-react';
import Link from 'next/link';

// ─── Mock Data ────────────────────────────────────────────────────

const mockDashboard = {
  kitty: {
    activeSchemes: 3,
    totalMembers: 85,
    collectionDuePaise: 4_25_000_00,
  },
  goldSavings: {
    activeSchemes: 2,
    totalMembers: 120,
    totalDepositsPaise: 18_00_000_00,
  },
};

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10_000_000) return `${(rupees / 10_000_000).toFixed(2)} Cr`;
  if (rupees >= 100_000) return `${(rupees / 100_000).toFixed(2)} L`;
  return rupees.toLocaleString('en-IN');
}

const schemeLinks = [
  {
    href: '/finance/schemes/kitty',
    icon: Users,
    label: 'Kitty Schemes',
    description: 'Chit fund & kitty party schemes',
    stats: `${mockDashboard.kitty.activeSchemes} active, ${mockDashboard.kitty.totalMembers} members`,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
  },
  {
    href: '/finance/schemes/gold-savings',
    icon: Coins,
    label: 'Gold Savings',
    description: 'Monthly gold savings plans with bonus',
    stats: `${mockDashboard.goldSavings.activeSchemes} active, ${mockDashboard.goldSavings.totalMembers} members`,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
  },
];

// ─── Page ─────────────────────────────────────────────────────────

export default function SchemesHubPage() {
  const d = mockDashboard;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schemes"
        description="Kitty, chit fund, and gold savings schemes for customers."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Schemes' },
        ]}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Kitty Schemes"
          value={String(d.kitty.activeSchemes)}
          icon={<Users className="h-5 w-5 text-purple-600" />}
        />
        <StatCard
          title="Collection Due (Kitty)"
          value={formatRupees(d.kitty.collectionDuePaise)}
          icon={<Calendar className="h-5 w-5 text-red-500" />}
        />
        <StatCard
          title="Active Gold Savings"
          value={String(d.goldSavings.activeSchemes)}
          icon={<Coins className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Total Deposits"
          value={formatRupees(d.goldSavings.totalDepositsPaise)}
          icon={<IndianRupee className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      {/* Scheme Navigation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {schemeLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-4 rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
          >
            <div className={`rounded-lg p-3 ${link.bgColor}`}>
              <link.icon className={`h-6 w-6 ${link.color}`} />
            </div>
            <div>
              <h3 className="font-semibold">{link.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
              <p className="mt-2 text-sm font-medium">{link.stats}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
