'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, EmptyState } from '@caratflow/ui';
import { Users, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = trpc.crm.customerList.useQuery({
    page,
    limit: 20,
    search: search || undefined,
  } as never);
  const d = data as { items?: Array<Record<string, unknown>>; total?: number; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Customer database and 360° profiles."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Customers' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        }
      />

      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by name, phone, or email..."
        className="h-9 w-72 rounded-md border bg-transparent px-3 text-sm"
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_1.2fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Phone</span>
          <span>Email</span>
          <span>City</span>
          <span>Type</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />} title="No customers" />
        ) : (
          <div className="divide-y">
            {items.map((c) => (
              <Link key={c.id as string} href={`/crm/customers/${c.id}`} className="grid grid-cols-[1.4fr_1fr_1.2fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{`${(c.firstName as string) ?? ''} ${(c.lastName as string) ?? ''}`.trim()}</span>
                <span>{(c.phone as string) ?? '-'}</span>
                <span className="text-muted-foreground">{(c.email as string) ?? '-'}</span>
                <span>{(c.city as string) ?? '-'}</span>
                <span className="text-xs">{(c.customerType as string) ?? '-'}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {d && d.totalPages != null && d.totalPages > 0 && (
        <PaginationControls
          page={d.page ?? 1}
          totalPages={d.totalPages}
          hasPrevious={d.hasPrevious ?? false}
          hasNext={d.hasNext ?? false}
          onChange={setPage}
        />
      )}
    </div>
  );
}
