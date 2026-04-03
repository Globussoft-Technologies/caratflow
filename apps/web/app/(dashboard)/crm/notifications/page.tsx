'use client';

import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import type { ColumnDef } from '@caratflow/ui';
import { Bell, FileText } from 'lucide-react';
import Link from 'next/link';

interface NotificationLogRow {
  id: string;
  customerName: string;
  channel: string;
  subject: string | null;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
}

const logs: NotificationLogRow[] = [
  { id: '1', customerName: 'Priya Sharma', channel: 'WHATSAPP', subject: 'Diwali Gold Offer', status: 'DELIVERED', sentAt: new Date(Date.now() - 86400000), createdAt: new Date(Date.now() - 86400000) },
  { id: '2', customerName: 'Rahul Mehta', channel: 'SMS', subject: null, status: 'SENT', sentAt: new Date(Date.now() - 2 * 86400000), createdAt: new Date(Date.now() - 2 * 86400000) },
  { id: '3', customerName: 'Anita Desai', channel: 'EMAIL', subject: 'Birthday Wishes', status: 'DELIVERED', sentAt: new Date(Date.now() - 3 * 86400000), createdAt: new Date(Date.now() - 3 * 86400000) },
  { id: '4', customerName: 'Vikram Singh', channel: 'WHATSAPP', subject: 'New Collection Launch', status: 'FAILED', sentAt: null, createdAt: new Date(Date.now() - 4 * 86400000) },
  { id: '5', customerName: 'Meena Patel', channel: 'SMS', subject: null, status: 'QUEUED', sentAt: null, createdAt: new Date() },
];

const columns: ColumnDef<NotificationLogRow>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ getValue }) => (getValue() as Date).toLocaleDateString('en-IN'),
  },
  { accessorKey: 'customerName', header: 'Customer' },
  {
    accessorKey: 'channel',
    header: 'Channel',
    cell: ({ getValue }) => <StatusBadge label={getValue() as string} variant="muted" dot={false} />,
  },
  {
    accessorKey: 'subject',
    header: 'Subject',
    cell: ({ getValue }) => (getValue() as string) ?? '-',
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
    accessorKey: 'sentAt',
    header: 'Sent At',
    cell: ({ getValue }) => {
      const d = getValue() as Date | null;
      return d ? d.toLocaleString('en-IN') : '-';
    },
  },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="View notification logs and manage templates."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Notifications' },
        ]}
        actions={
          <Link
            href="/crm/notifications/templates"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent"
          >
            <FileText className="h-4 w-4" />
            Templates
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={logs}
        searchKey="customerName"
        searchPlaceholder="Search by customer..."
      />
    </div>
  );
}
