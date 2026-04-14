'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate } from '@/components/format';

export default function ExportInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params?.id ?? '';
  const { data, isLoading } = trpc.export.getInvoice.useQuery({ invoiceId }, { enabled: Boolean(invoiceId) });
  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const i: Record<string, unknown> = (data as unknown) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader title={(i.invoiceNumber as string) ?? 'Export Invoice'} breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Export', href: '/export' },
        { label: 'Invoices', href: '/export/invoices' },
        { label: (i.invoiceNumber as string) ?? '' },
      ]} />
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{(i.invoiceType as string) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{(i.currency as string) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatPaise(i.totalPaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Issued</span><span>{formatDate(i.issuedDate)}</span></div>
      </div>
    </div>
  );
}
