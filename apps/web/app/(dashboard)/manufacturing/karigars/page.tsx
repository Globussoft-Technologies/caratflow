'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { Plus } from 'lucide-react';
import { KarigarCard } from '@/features/manufacturing';

// Placeholder data
const KARIGARS = [
  { id: 'k1', employeeCode: 'KRG-001', firstName: 'Ramesh', lastName: 'Kumar', skillLevel: 'MASTER', specialization: 'Gold Necklaces', locationName: 'Main Workshop', isActive: true, currentJobNumber: 'JO-000005' },
  { id: 'k2', employeeCode: 'KRG-002', firstName: 'Suresh', lastName: 'Mahajan', skillLevel: 'SENIOR', specialization: 'Diamond Setting', locationName: 'Main Workshop', isActive: true, currentJobNumber: 'JO-000003' },
  { id: 'k3', employeeCode: 'KRG-003', firstName: 'Dinesh', lastName: 'Patel', skillLevel: 'JUNIOR', specialization: 'Silver Work', locationName: 'Main Workshop', isActive: true, currentJobNumber: 'JO-000004' },
  { id: 'k4', employeeCode: 'KRG-004', firstName: 'Mukesh', lastName: 'Singh', skillLevel: 'APPRENTICE', specialization: 'Polishing', locationName: 'Branch Workshop', isActive: true, currentJobNumber: null },
  { id: 'k5', employeeCode: 'KRG-005', firstName: 'Ganesh', lastName: 'Verma', skillLevel: 'SENIOR', specialization: 'Kundan Work', locationName: 'Main Workshop', isActive: false, currentJobNumber: null },
];

export default function KarigarsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Karigars"
        description="Manage artisans and craftsmen."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Karigars' },
        ]}
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Karigar
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KARIGARS.map((karigar) => (
          <KarigarCard
            key={karigar.id}
            {...karigar}
            onClick={(id) => {
              window.location.href = `/manufacturing/karigars/${id}`;
            }}
          />
        ))}
      </div>
    </div>
  );
}
