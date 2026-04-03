'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { FileText, Search, Filter } from 'lucide-react';
import { AuditLogTable } from '@/features/platform/AuditLogTable';

export default function AuditLogPage() {
  const [filters, setFilters] = useState({
    entityType: '',
    userId: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  });
  const [activeTab, setActiveTab] = useState<'audit' | 'activity'>('audit');

  // TODO: Fetch from API
  const auditLogs: Record<string, unknown>[] = [];
  const activityLogs: Record<string, unknown>[] = [];
  const entityTypes: string[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track data changes and user activity across the system."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Audit Log' },
        ]}
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'audit' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
        >
          Data Changes
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'activity' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
        >
          User Activity
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {activeTab === 'audit' && (
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="">All entities</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="Action..."
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={() => setFilters({ entityType: '', userId: '', action: '', dateFrom: '', dateTo: '' })}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results */}
      {activeTab === 'audit' ? (
        <AuditLogTable logs={auditLogs} type="audit" />
      ) : (
        <AuditLogTable logs={activityLogs} type="activity" />
      )}
    </div>
  );
}
