'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, getStatusVariant, DataTable, type ColumnDef } from '@caratflow/ui';
import { Plus, LayoutGrid, Table } from 'lucide-react';
import { JobKanbanBoard } from '@/features/manufacturing';

interface JobRow {
  id: string;
  jobNumber: string;
  productName: string;
  status: string;
  priority: string;
  karigarName: string | null;
  locationName: string;
  estimatedEndDate: string | null;
  createdAt: string;
}

const columns: ColumnDef<JobRow, unknown>[] = [
  {
    accessorKey: 'jobNumber',
    header: 'Job #',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.jobNumber}</span>,
  },
  {
    accessorKey: 'productName',
    header: 'Product',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge
        label={row.original.status.replace(/_/g, ' ')}
        variant={getStatusVariant(row.original.status)}
      />
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const variant = row.original.priority === 'URGENT' ? 'danger' : row.original.priority === 'HIGH' ? 'warning' : 'muted';
      return <StatusBadge label={row.original.priority} variant={variant} dot={false} />;
    },
  },
  {
    accessorKey: 'karigarName',
    header: 'Karigar',
    cell: ({ row }) => row.original.karigarName ?? '-',
  },
  {
    accessorKey: 'locationName',
    header: 'Location',
  },
  {
    accessorKey: 'estimatedEndDate',
    header: 'Due Date',
    cell: ({ row }) => row.original.estimatedEndDate ? new Date(row.original.estimatedEndDate).toLocaleDateString() : '-',
  },
];

// Placeholder data
const JOBS: JobRow[] = [
  { id: '1', jobNumber: 'JO-000001', productName: '22K Gold Necklace', status: 'PLANNED', priority: 'HIGH', karigarName: 'Ramesh K.', locationName: 'Main Workshop', estimatedEndDate: '2026-04-10', createdAt: '2026-04-01' },
  { id: '2', jobNumber: 'JO-000002', productName: '18K Diamond Ring', status: 'IN_PROGRESS', priority: 'URGENT', karigarName: 'Suresh M.', locationName: 'Main Workshop', estimatedEndDate: '2026-04-08', createdAt: '2026-04-01' },
  { id: '3', jobNumber: 'JO-000003', productName: '22K Gold Bangle Set', status: 'MATERIAL_ISSUED', priority: 'MEDIUM', karigarName: 'Suresh M.', locationName: 'Branch Workshop', estimatedEndDate: '2026-04-15', createdAt: '2026-04-02' },
  { id: '4', jobNumber: 'JO-000004', productName: 'Silver Temple Jewellery', status: 'QC_PENDING', priority: 'LOW', karigarName: 'Dinesh P.', locationName: 'Main Workshop', estimatedEndDate: '2026-04-20', createdAt: '2026-04-02' },
  { id: '5', jobNumber: 'JO-000005', productName: '22K Gold Chain', status: 'COMPLETED', priority: 'MEDIUM', karigarName: 'Ramesh K.', locationName: 'Main Workshop', estimatedEndDate: '2026-04-05', createdAt: '2026-03-28' },
];

const KANBAN_COLUMNS = [
  { status: 'PLANNED', label: 'Planned', jobs: JOBS.filter(j => j.status === 'PLANNED').map(j => ({ id: j.id, jobNumber: j.jobNumber, productName: j.productName, priority: j.priority, karigarName: j.karigarName ?? undefined, estimatedEndDate: j.estimatedEndDate ?? undefined })) },
  { status: 'MATERIAL_ISSUED', label: 'Material Issued', jobs: JOBS.filter(j => j.status === 'MATERIAL_ISSUED').map(j => ({ id: j.id, jobNumber: j.jobNumber, productName: j.productName, priority: j.priority, karigarName: j.karigarName ?? undefined, estimatedEndDate: j.estimatedEndDate ?? undefined })) },
  { status: 'IN_PROGRESS', label: 'In Progress', jobs: JOBS.filter(j => j.status === 'IN_PROGRESS').map(j => ({ id: j.id, jobNumber: j.jobNumber, productName: j.productName, priority: j.priority, karigarName: j.karigarName ?? undefined, estimatedEndDate: j.estimatedEndDate ?? undefined })) },
  { status: 'QC_PENDING', label: 'QC Pending', jobs: JOBS.filter(j => j.status === 'QC_PENDING').map(j => ({ id: j.id, jobNumber: j.jobNumber, productName: j.productName, priority: j.priority, karigarName: j.karigarName ?? undefined, estimatedEndDate: j.estimatedEndDate ?? undefined })) },
  { status: 'COMPLETED', label: 'Completed', jobs: JOBS.filter(j => j.status === 'COMPLETED').map(j => ({ id: j.id, jobNumber: j.jobNumber, productName: j.productName, priority: j.priority, karigarName: j.karigarName ?? undefined, estimatedEndDate: j.estimatedEndDate ?? undefined })) },
];

export default function JobOrdersPage() {
  const [view, setView] = React.useState<'kanban' | 'table'>('kanban');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Orders"
        description="Track and manage production job orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Job Orders' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <button
                className={`px-2.5 py-1.5 text-sm ${view === 'kanban' ? 'bg-muted' : ''}`}
                onClick={() => setView('kanban')}
                title="Kanban view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                className={`px-2.5 py-1.5 text-sm ${view === 'table' ? 'bg-muted' : ''}`}
                onClick={() => setView('table')}
                title="Table view"
              >
                <Table className="h-4 w-4" />
              </button>
            </div>
            <a
              href="/manufacturing/jobs/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Job Order
            </a>
          </div>
        }
      />

      {view === 'kanban' ? (
        <JobKanbanBoard
          columns={KANBAN_COLUMNS}
          onJobClick={(id) => {
            window.location.href = `/manufacturing/jobs/${id}`;
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={JOBS}
          searchKey="jobNumber"
          searchPlaceholder="Search job orders..."
          onRowClick={(row) => {
            window.location.href = `/manufacturing/jobs/${row.id}`;
          }}
        />
      )}
    </div>
  );
}
