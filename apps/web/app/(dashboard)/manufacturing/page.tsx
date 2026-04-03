'use client';

import { PageHeader, StatCard } from '@caratflow/ui';
import { Factory, Hammer, CheckCircle, Clock, Users } from 'lucide-react';
import { JobKanbanBoard } from '@/features/manufacturing';

// Placeholder data -- will be replaced with tRPC query
const DASHBOARD_DATA = {
  activeJobs: 12,
  karigarUtilization: 78,
  wipValuePaise: 4_500_000_00,
  pendingQc: 3,
  completedToday: 5,
};

const KANBAN_COLUMNS = [
  {
    status: 'PLANNED',
    label: 'Planned',
    jobs: [
      { id: '1', jobNumber: 'JO-000001', productName: '22K Gold Necklace', priority: 'HIGH', karigarName: 'Ramesh K.', estimatedEndDate: '2026-04-10' },
      { id: '2', jobNumber: 'JO-000002', productName: '18K Diamond Ring', priority: 'URGENT', estimatedEndDate: '2026-04-08' },
    ],
  },
  {
    status: 'MATERIAL_ISSUED',
    label: 'Material Issued',
    jobs: [
      { id: '3', jobNumber: 'JO-000003', productName: '22K Gold Bangle Set', priority: 'MEDIUM', karigarName: 'Suresh M.', estimatedEndDate: '2026-04-15' },
    ],
  },
  {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    jobs: [
      { id: '4', jobNumber: 'JO-000004', productName: 'Silver Temple Jewellery', priority: 'LOW', karigarName: 'Dinesh P.', estimatedEndDate: '2026-04-20' },
      { id: '5', jobNumber: 'JO-000005', productName: '22K Gold Chain', priority: 'MEDIUM', karigarName: 'Ramesh K.' },
    ],
  },
  {
    status: 'QC_PENDING',
    label: 'QC Pending',
    jobs: [
      { id: '6', jobNumber: 'JO-000006', productName: '24K Gold Coin', priority: 'HIGH', karigarName: 'Suresh M.', estimatedEndDate: '2026-04-05' },
    ],
  },
  {
    status: 'COMPLETED',
    label: 'Completed',
    jobs: [],
  },
];

function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function ManufacturingDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing"
        description="Production management, job orders, and karigar tracking."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Active Jobs"
          value={String(DASHBOARD_DATA.activeJobs)}
          icon={<Factory className="h-5 w-5" />}
        />
        <StatCard
          title="Karigar Utilization"
          value={`${DASHBOARD_DATA.karigarUtilization}%`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="WIP Value"
          value={formatCurrency(DASHBOARD_DATA.wipValuePaise)}
          icon={<Hammer className="h-5 w-5" />}
        />
        <StatCard
          title="QC Pending"
          value={String(DASHBOARD_DATA.pendingQc)}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Completed Today"
          value={String(DASHBOARD_DATA.completedToday)}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>

      {/* Kanban Board */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Job Orders by Status</h2>
        <JobKanbanBoard
          columns={KANBAN_COLUMNS}
          onJobClick={(id) => {
            window.location.href = `/manufacturing/jobs/${id}`;
          }}
        />
      </div>
    </div>
  );
}
