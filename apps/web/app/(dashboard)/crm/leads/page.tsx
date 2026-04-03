'use client';

import { PageHeader, StatusBadge, DataTable } from '@caratflow/ui';
import type { ColumnDef } from '@caratflow/ui';
import { Target, Plus, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface LeadRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  source: string;
  status: string;
  estimatedValuePaise: number | null;
  assignedTo: string | null;
  nextFollowUpDate: Date | null;
  createdAt: Date;
}

const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'] as const;

const leads: LeadRow[] = [
  { id: '1', firstName: 'Ajay', lastName: 'Kapoor', phone: '+919876543220', source: 'WALK_IN', status: 'NEW', estimatedValuePaise: 5000000, assignedTo: 'Ravi', nextFollowUpDate: new Date(Date.now() + 86400000), createdAt: new Date(Date.now() - 86400000) },
  { id: '2', firstName: 'Neha', lastName: 'Gupta', phone: '+919876543221', source: 'REFERRAL', status: 'CONTACTED', estimatedValuePaise: 15000000, assignedTo: 'Priyanka', nextFollowUpDate: new Date(Date.now() + 2 * 86400000), createdAt: new Date(Date.now() - 3 * 86400000) },
  { id: '3', firstName: 'Sanjay', lastName: 'Joshi', phone: '+919876543222', source: 'WEBSITE', status: 'QUALIFIED', estimatedValuePaise: 8000000, assignedTo: 'Ravi', nextFollowUpDate: null, createdAt: new Date(Date.now() - 5 * 86400000) },
  { id: '4', firstName: 'Kavita', lastName: 'Reddy', phone: '+919876543223', source: 'SOCIAL_MEDIA', status: 'PROPOSAL', estimatedValuePaise: 25000000, assignedTo: 'Deepak', nextFollowUpDate: new Date(Date.now() + 3 * 86400000), createdAt: new Date(Date.now() - 7 * 86400000) },
  { id: '5', firstName: 'Arun', lastName: 'Nair', phone: '+919876543224', source: 'CAMPAIGN', status: 'NEGOTIATION', estimatedValuePaise: 12000000, assignedTo: 'Priyanka', nextFollowUpDate: new Date(Date.now() + 86400000), createdAt: new Date(Date.now() - 10 * 86400000) },
  { id: '6', firstName: 'Divya', lastName: 'Mishra', phone: '+919876543225', source: 'WALK_IN', status: 'NEW', estimatedValuePaise: 3000000, assignedTo: null, nextFollowUpDate: null, createdAt: new Date() },
];

function formatMoney(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

const statusVariant: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger' | 'muted'> = {
  NEW: 'default',
  CONTACTED: 'info',
  QUALIFIED: 'warning',
  PROPOSAL: 'info',
  NEGOTIATION: 'warning',
  WON: 'success',
  LOST: 'danger',
};

const columns: ColumnDef<LeadRow>[] = [
  {
    accessorKey: 'firstName',
    header: 'Name',
    cell: ({ row }) => (
      <Link href={`/crm/leads/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.firstName} {row.original.lastName}
      </Link>
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ getValue }) => getValue() ?? '-',
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ getValue }) => <StatusBadge label={(getValue() as string).replace('_', ' ')} variant="muted" dot={false} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const s = getValue() as string;
      return <StatusBadge label={s} variant={statusVariant[s] ?? 'default'} />;
    },
  },
  {
    accessorKey: 'estimatedValuePaise',
    header: 'Est. Value',
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v ? formatMoney(v) : '-';
    },
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assigned To',
    cell: ({ getValue }) => getValue() ?? 'Unassigned',
  },
  {
    accessorKey: 'nextFollowUpDate',
    header: 'Follow-up',
    cell: ({ getValue }) => {
      const d = getValue() as Date | null;
      if (!d) return '-';
      const isOverdue = d < new Date();
      return (
        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
          {d.toLocaleDateString('en-IN')}
        </span>
      );
    },
  },
];

function KanbanBoard({ leads }: { leads: LeadRow[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.status === stage);
        return (
          <div key={stage} className="min-w-[250px] flex-1 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">{stage.replace('_', ' ')}</h4>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{stageLeads.length}</span>
            </div>
            <div className="space-y-2">
              {stageLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/crm/leads/${lead.id}`}
                  className="block rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <p className="font-medium text-sm">{lead.firstName} {lead.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lead.source.replace('_', ' ')}
                  </p>
                  {lead.estimatedValuePaise && (
                    <p className="text-sm font-medium text-emerald-600 mt-1">
                      {formatMoney(lead.estimatedValuePaise)}
                    </p>
                  )}
                  {lead.assignedTo && (
                    <p className="text-xs text-muted-foreground mt-1">{lead.assignedTo}</p>
                  )}
                </Link>
              ))}
              {stageLeads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No leads</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LeadsPage() {
  const [view, setView] = useState<'kanban' | 'table'>('kanban');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Pipeline"
        description="Track and manage sales leads through the pipeline."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Leads' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <button
                onClick={() => setView('kanban')}
                className={`inline-flex h-9 w-9 items-center justify-center text-sm ${view === 'kanban' ? 'bg-muted' : ''}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('table')}
                className={`inline-flex h-9 w-9 items-center justify-center text-sm ${view === 'table' ? 'bg-muted' : ''}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              New Lead
            </button>
          </div>
        }
      />

      {view === 'kanban' ? (
        <KanbanBoard leads={leads} />
      ) : (
        <DataTable
          columns={columns}
          data={leads}
          searchKey="firstName"
          searchPlaceholder="Search leads..."
          onRowClick={(row) => {
            window.location.href = `/crm/leads/${row.id}`;
          }}
        />
      )}
    </div>
  );
}
