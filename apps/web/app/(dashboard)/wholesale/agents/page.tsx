'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Plus, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise } from '@/components/format';

export default function AgentsPage() {
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState(true);

  const { data, isLoading } = trpc.wholesale.listAgents.useQuery({
    filters: { isActive: activeOnly || undefined },
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  const { data: commissionData } = trpc.wholesale.listCommissions.useQuery({
    pagination: { page: 1, limit: 10, sortOrder: 'desc' },
  });
  const commissions = ((commissionData?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents & Brokers"
        description="Manage agents, calculate commissions, and track payouts."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Agents' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Agent
          </button>
        }
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={activeOnly} onChange={(e) => { setActiveOnly(e.target.checked); setPage(1); }} />
        Active only
      </label>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Agents</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Name</span>
            <span>Commission Type</span>
            <span>Value</span>
            <span>Phone</span>
            <span>Status</span>
          </div>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <EmptyState icon={<Users className="h-8 w-8" />} title="No agents" />
          ) : (
            <div className="divide-y">
              {items.map((a) => (
                <Link
                  key={a.id as string}
                  href={`/wholesale/agents/${a.id}`}
                  className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm hover:bg-accent"
                >
                  <span className="font-medium">{a.name as string}</span>
                  <span>{a.commissionType as string}</span>
                  <span>{String(a.commissionValue ?? '-')}</span>
                  <span className="text-muted-foreground text-xs">{(a.phone as string) ?? '-'}</span>
                  <StatusBadge label={a.isActive ? 'Active' : 'Inactive'} variant={a.isActive ? 'success' : 'default'} />
                </Link>
              ))}
            </div>
          )}
        </div>
        {data && <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Commissions</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Agent</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Reference</span>
          </div>
          {commissions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No commissions yet.</div>
          ) : (
            <div className="divide-y">
              {commissions.map((c) => (
                <div key={c.id as string} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span className="font-medium">{((c.agentBroker as { name?: string })?.name) ?? '-'}</span>
                  <span>{formatPaise(c.commissionAmountPaise)}</span>
                  <span>{c.status as string}</span>
                  <span className="text-muted-foreground">{(c.referenceType as string) ?? '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
