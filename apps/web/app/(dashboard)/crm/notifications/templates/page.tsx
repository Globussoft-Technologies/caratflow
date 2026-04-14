'use client';

import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function NotificationTemplatesPage() {
  const { data, isLoading } = trpc.crm.notificationTemplateList.useQuery();
  const items = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Templates"
        description="Reusable templates for SMS, email, and WhatsApp."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Notifications', href: '/crm/notifications' },
          { label: 'Templates' },
        ]}
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Channel</span>
          <span>Category</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="No templates" />
        ) : (
          <div className="divide-y">
            {items.map((t) => (
              <div key={t.id as string} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(t.name as string) ?? '-'}</span>
                <span>{(t.channel as string) ?? '-'}</span>
                <span className="text-muted-foreground">{(t.category as string) ?? '-'}</span>
                <StatusBadge label={t.isActive ? 'Active' : 'Inactive'} variant={t.isActive ? 'success' : 'default'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
