'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, getStatusVariant, DataTable, type ColumnDef } from '@caratflow/ui';
import { Plus, Play } from 'lucide-react';

interface PlanRow {
  id: string;
  name: string;
  locationName: string;
  startDate: string;
  endDate: string;
  status: string;
  itemCount: number;
  jobsGenerated: number;
}

const columns: ColumnDef<PlanRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Plan Name',
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'locationName',
    header: 'Location',
  },
  {
    accessorKey: 'startDate',
    header: 'Start',
    cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString(),
  },
  {
    accessorKey: 'endDate',
    header: 'End',
    cell: ({ row }) => new Date(row.original.endDate).toLocaleDateString(),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge label={row.original.status} variant={getStatusVariant(row.original.status)} />
    ),
  },
  {
    accessorKey: 'itemCount',
    header: 'Items',
  },
  {
    accessorKey: 'jobsGenerated',
    header: 'Jobs Created',
  },
];

// Placeholder data
const PLANS: PlanRow[] = [
  { id: '1', name: 'April Week 1 Production', locationName: 'Main Workshop', startDate: '2026-04-01', endDate: '2026-04-07', status: 'ACTIVE', itemCount: 8, jobsGenerated: 6 },
  { id: '2', name: 'April Week 2 Production', locationName: 'Main Workshop', startDate: '2026-04-08', endDate: '2026-04-14', status: 'DRAFT', itemCount: 5, jobsGenerated: 0 },
  { id: '3', name: 'Silver Collection Batch', locationName: 'Branch Workshop', startDate: '2026-04-01', endDate: '2026-04-30', status: 'ACTIVE', itemCount: 12, jobsGenerated: 12 },
];

export default function ProductionPlanningPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Planning"
        description="Plan production schedules and generate job orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Planning' },
        ]}
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Plan
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={PLANS}
        searchKey="name"
        searchPlaceholder="Search plans..."
      />
    </div>
  );
}
