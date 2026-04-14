'use client';

import { useState } from 'react';
import { PageHeader, EmptyState } from '@caratflow/ui';
import { FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDateTime } from '@/components/format';

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'audit' | 'activity'>('audit');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');

  const audit = trpc.platform.audit.logs.useQuery(
    { page, limit: 25, sortOrder: 'desc', entityType: entityType || undefined, action: action || undefined },
    { enabled: activeTab === 'audit' },
  );
  const activity = trpc.platform.audit.activities.useQuery(
    { page, limit: 25, sortOrder: 'desc', action: action || undefined },
    { enabled: activeTab === 'activity' },
  );
  const { data: entityTypes } = trpc.platform.audit.entityTypes.useQuery(undefined, { enabled: activeTab === 'audit' });

  const data = activeTab === 'audit' ? audit.data : activity.data;
  const isLoading = activeTab === 'audit' ? audit.isLoading : activity.isLoading;
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings', href: '/settings' },
        { label: 'Audit Log' },
      ]} />

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button onClick={() => { setActiveTab('audit'); setPage(1); }} className={`flex-1 rounded-md px-4 py-2 text-sm ${activeTab === 'audit' ? 'bg-background shadow-sm' : ''}`}>Data Changes</button>
        <button onClick={() => { setActiveTab('activity'); setPage(1); }} className={`flex-1 rounded-md px-4 py-2 text-sm ${activeTab === 'activity' ? 'bg-background shadow-sm' : ''}`}>User Activity</button>
      </div>

      <div className="flex flex-wrap gap-3">
        {activeTab === 'audit' && (
          <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="h-9 rounded-md border px-2 text-sm">
            <option value="">All entities</option>
            {((entityTypes as string[] | undefined) ?? []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <input value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="Action..." className="h-9 rounded-md border px-3 text-sm" />
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_1.4fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>User</span>
          <span>Action</span>
          <span>{activeTab === 'audit' ? 'Entity' : 'Resource'}</span>
          <span>Status</span>
          <span>When</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="No logs" />
        ) : (
          <div className="divide-y">
            {items.map((l) => (
              <div key={l.id as string} className="grid grid-cols-[1fr_1fr_1.4fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{(l.userName as string) ?? (l.userId as string) ?? '-'}</span>
                <span className="font-mono text-xs">{(l.action as string) ?? '-'}</span>
                <span>{(l.entityType as string) ?? (l.resource as string) ?? '-'}</span>
                <span>{(l.status as string) ?? '-'}</span>
                <span className="text-muted-foreground">{formatDateTime(l.createdAt ?? l.timestamp)}</span>
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
