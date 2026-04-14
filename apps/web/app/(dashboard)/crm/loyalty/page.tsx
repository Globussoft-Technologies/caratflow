'use client';

import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Gift } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/components/format';

export default function LoyaltyPage() {
  const { data, isLoading } = trpc.crm.loyaltyProgramList.useQuery();
  const programs = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty Programs"
        description="Reward customers with points and tiers."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Loyalty' },
        ]}
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Points / Rupee</span>
          <span>Redemption Value</span>
          <span>Status</span>
          <span>Updated</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : programs.length === 0 ? (
          <EmptyState icon={<Gift className="h-8 w-8" />} title="No loyalty programs" />
        ) : (
          <div className="divide-y">
            {programs.map((p) => (
              <div key={p.id as string} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(p.name as string) ?? '-'}</span>
                <span>{String(p.pointsPerRupee ?? '-')}</span>
                <span>{String(p.redemptionValue ?? '-')}</span>
                <StatusBadge label={p.isActive ? 'Active' : 'Inactive'} variant={p.isActive ? 'success' : 'default'} />
                <span className="text-muted-foreground">{formatDate(p.updatedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
