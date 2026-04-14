'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Plus, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';

export default function KarigarsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.manufacturing.karigar.list.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Karigars"
        description="Artisans and workshop staff."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Karigars' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Karigar
          </button>
        }
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Code</span>
          <span>Name</span>
          <span>Skill</span>
          <span>Specialization</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />} title="No karigars" />
        ) : (
          <div className="divide-y">
            {items.map((k) => (
              <Link key={k.id as string} href={`/manufacturing/karigars/${k.id}`} className="grid grid-cols-[1fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-mono">{(k.employeeCode as string) ?? '-'}</span>
                <span className="font-medium">{`${(k.firstName as string) ?? ''} ${(k.lastName as string) ?? ''}`.trim()}</span>
                <span>{(k.skillLevel as string) ?? '-'}</span>
                <span className="text-muted-foreground">{(k.specialization as string) ?? '-'}</span>
                <StatusBadge label={k.isActive ? 'Active' : 'Inactive'} variant={k.isActive ? 'success' : 'default'} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {data && <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />}
    </div>
  );
}
