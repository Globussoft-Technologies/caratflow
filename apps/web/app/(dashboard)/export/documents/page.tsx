'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function ExportDocumentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.export.listDocuments.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Shipping Documents" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Export', href: '/export' },
        { label: 'Documents' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Doc #</span>
          <span>Type</span>
          <span>Order</span>
          <span>Status</span>
          <span>Issued</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="No documents" />
        ) : (
          <div className="divide-y">
            {items.map((doc) => (
              <div key={doc.id as string} className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono">{(doc.documentNumber as string) ?? '-'}</span>
                <span>{(doc.documentType as string) ?? '-'}</span>
                <span className="font-mono text-xs">{((doc.exportOrder as { orderNumber?: string })?.orderNumber) ?? '-'}</span>
                <StatusBadge label={(doc.status as string) ?? '-'} variant="default" />
                <span className="text-muted-foreground">{formatDate(doc.issuedDate)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {d && d.totalPages && d.totalPages > 0 && (
        <PaginationControls page={d.page ?? 1} totalPages={d.totalPages} hasPrevious={d.hasPrevious ?? false} hasNext={d.hasNext ?? false} onChange={setPage} />
      )}
    </div>
  );
}
