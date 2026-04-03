'use client';

import { PageHeader, DataTable, StatusBadge } from '@caratflow/ui';
import type { ColumnDef } from '@caratflow/ui';
import { Plus, FileText, Eye } from 'lucide-react';
import { useState } from 'react';

interface TemplateRow {
  id: string;
  name: string;
  channel: string;
  category: string;
  subject: string | null;
  body: string;
  variables: string[];
  isActive: boolean;
}

const templates: TemplateRow[] = [
  {
    id: '1', name: 'Birthday Wishes', channel: 'WHATSAPP', category: 'REMINDER',
    subject: null,
    body: 'Dear {{firstName}}, Wishing you a wonderful birthday! Visit us for a special birthday discount. - {{storeName}}',
    variables: ['firstName', 'storeName'], isActive: true,
  },
  {
    id: '2', name: 'Anniversary Reminder', channel: 'SMS', category: 'REMINDER',
    subject: null,
    body: 'Hi {{firstName}}, your anniversary is coming up on {{date}}! Explore our latest collection for the perfect gift.',
    variables: ['firstName', 'date'], isActive: true,
  },
  {
    id: '3', name: 'New Collection Launch', channel: 'EMAIL', category: 'PROMOTIONAL',
    subject: 'Introducing Our Latest Collection - {{collectionName}}',
    body: 'Dear {{firstName}},\n\nWe are excited to announce our new {{collectionName}} collection. Visit your nearest store to explore.\n\nBest regards,\n{{storeName}}',
    variables: ['firstName', 'collectionName', 'storeName'], isActive: true,
  },
  {
    id: '4', name: 'Order Confirmation', channel: 'WHATSAPP', category: 'TRANSACTIONAL',
    subject: null,
    body: 'Hi {{firstName}}, your order {{orderNumber}} has been confirmed. Total: Rs. {{totalAmount}}. Thank you for shopping with us!',
    variables: ['firstName', 'orderNumber', 'totalAmount'], isActive: true,
  },
];

const columns: ColumnDef<TemplateRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  {
    accessorKey: 'channel',
    header: 'Channel',
    cell: ({ getValue }) => <StatusBadge label={getValue() as string} variant="muted" dot={false} />,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ getValue }) => {
      const cat = getValue() as string;
      const v: Record<string, 'info' | 'warning' | 'default'> = { TRANSACTIONAL: 'info', PROMOTIONAL: 'warning', REMINDER: 'default' };
      return <StatusBadge label={cat} variant={v[cat] ?? 'default'} dot={false} />;
    },
  },
  {
    accessorKey: 'variables',
    header: 'Variables',
    cell: ({ getValue }) => {
      const vars = getValue() as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {vars.map((v) => (
            <span key={v} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{`{{${v}}}`}</span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ getValue }) => (
      <StatusBadge label={getValue() ? 'Active' : 'Inactive'} variant={getValue() ? 'success' : 'muted'} />
    ),
  },
];

export default function NotificationTemplatesPage() {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewTemplate = templates.find((t) => t.id === previewId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Templates"
        description="Manage message templates for WhatsApp, SMS, and Email."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Notifications', href: '/crm/notifications' },
          { label: 'Templates' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Template
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={templates}
        searchKey="name"
        searchPlaceholder="Search templates..."
        onRowClick={(row) => setPreviewId(row.id === previewId ? null : row.id)}
      />

      {/* Template Preview */}
      {previewTemplate && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4" /> Template Preview: {previewTemplate.name}
            </h3>
            <button onClick={() => setPreviewId(null)} className="text-sm text-muted-foreground hover:text-foreground">
              Close
            </button>
          </div>
          {previewTemplate.subject && (
            <div className="mt-3">
              <span className="text-xs font-medium text-muted-foreground">Subject:</span>
              <p className="mt-1 text-sm">{previewTemplate.subject}</p>
            </div>
          )}
          <div className="mt-3">
            <span className="text-xs font-medium text-muted-foreground">Body:</span>
            <div className="mt-1 rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap font-mono">
              {previewTemplate.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
