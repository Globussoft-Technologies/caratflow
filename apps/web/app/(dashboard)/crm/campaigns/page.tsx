'use client';

import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import type { ColumnDef } from '@caratflow/ui';
import { Megaphone, Plus } from 'lucide-react';
import Link from 'next/link';

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  channel: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  scheduledAt: Date | null;
  createdAt: Date;
}

const campaigns: CampaignRow[] = [
  { id: '1', name: 'Diwali Gold Offer', status: 'COMPLETED', channel: 'WHATSAPP', totalRecipients: 450, sentCount: 448, deliveredCount: 440, failedCount: 2, scheduledAt: null, createdAt: new Date(Date.now() - 30 * 86400000) },
  { id: '2', name: 'New Collection Launch', status: 'ACTIVE', channel: 'SMS', totalRecipients: 320, sentCount: 180, deliveredCount: 175, failedCount: 5, scheduledAt: null, createdAt: new Date(Date.now() - 2 * 86400000) },
  { id: '3', name: 'Anniversary Special', status: 'SCHEDULED', channel: 'EMAIL', totalRecipients: 0, sentCount: 0, deliveredCount: 0, failedCount: 0, scheduledAt: new Date(Date.now() + 5 * 86400000), createdAt: new Date(Date.now() - 86400000) },
  { id: '4', name: 'Summer Sale Promo', status: 'DRAFT', channel: 'WHATSAPP', totalRecipients: 0, sentCount: 0, deliveredCount: 0, failedCount: 0, scheduledAt: null, createdAt: new Date() },
];

const columns: ColumnDef<CampaignRow>[] = [
  {
    accessorKey: 'name',
    header: 'Campaign',
    cell: ({ row }) => (
      <Link href={`/crm/campaigns/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const s = getValue() as string;
      return <StatusBadge label={s} variant={getStatusVariant(s)} />;
    },
  },
  {
    accessorKey: 'channel',
    header: 'Channel',
    cell: ({ getValue }) => <StatusBadge label={getValue() as string} variant="muted" dot={false} />,
  },
  {
    accessorKey: 'totalRecipients',
    header: 'Recipients',
    cell: ({ getValue }) => (getValue() as number).toLocaleString('en-IN'),
  },
  {
    accessorKey: 'sentCount',
    header: 'Sent',
    cell: ({ getValue }) => (getValue() as number).toLocaleString('en-IN'),
  },
  {
    accessorKey: 'deliveredCount',
    header: 'Delivered',
    cell: ({ row }) => {
      const { deliveredCount, sentCount } = row.original;
      const rate = sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0;
      return (
        <span>
          {deliveredCount.toLocaleString('en-IN')}{' '}
          {sentCount > 0 && <span className="text-xs text-muted-foreground">({rate}%)</span>}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ getValue }) => (getValue() as Date).toLocaleDateString('en-IN'),
  },
];

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Create and manage marketing campaigns."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Campaigns' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={campaigns}
        searchKey="name"
        searchPlaceholder="Search campaigns..."
        onRowClick={(row) => {
          window.location.href = `/crm/campaigns/${row.id}`;
        }}
      />
    </div>
  );
}
