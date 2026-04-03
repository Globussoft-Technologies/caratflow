'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { Wrench, Plus, List, LayoutGrid } from 'lucide-react';
import { RepairStatusBoard } from '../../../../src/features/retail/RepairStatusBoard';
import { cn } from '@caratflow/ui';

// Mock repair queue data
const mockQueue: Record<string, Array<{
  id: string;
  repairNumber: string;
  customerId: string;
  customerName: string;
  itemDescription: string;
  status: string;
  promisedDate: string | null;
  createdAt: string;
}>> = {
  RECEIVED: [
    { id: 'r1', repairNumber: 'RP/MUM/2604/0005', customerId: 'c1', customerName: 'Priya Sharma', itemDescription: 'Gold Chain - broken clasp', status: 'RECEIVED', promisedDate: '2026-04-10', createdAt: new Date().toISOString() },
    { id: 'r2', repairNumber: 'RP/MUM/2604/0006', customerId: 'c2', customerName: 'Raj Kumar', itemDescription: 'Silver Ring - resize', status: 'RECEIVED', promisedDate: '2026-04-08', createdAt: new Date().toISOString() },
  ],
  DIAGNOSED: [
    { id: 'r3', repairNumber: 'RP/MUM/2604/0004', customerId: 'c3', customerName: 'Anita Desai', itemDescription: 'Diamond Ring - prong repair', status: 'DIAGNOSED', promisedDate: '2026-04-12', createdAt: new Date().toISOString() },
  ],
  QUOTED: [],
  APPROVED: [
    { id: 'r4', repairNumber: 'RP/MUM/2604/0003', customerId: 'c4', customerName: 'Vijay Singh', itemDescription: 'Gold Bangle - dent removal', status: 'APPROVED', promisedDate: '2026-04-07', createdAt: new Date().toISOString() },
  ],
  IN_PROGRESS: [
    { id: 'r5', repairNumber: 'RP/MUM/2604/0002', customerId: 'c5', customerName: 'Meera Patel', itemDescription: 'Platinum Ring - polishing + stone setting', status: 'IN_PROGRESS', promisedDate: '2026-04-06', createdAt: new Date().toISOString() },
    { id: 'r6', repairNumber: 'RP/MUM/2604/0001', customerId: 'c6', customerName: 'Rahul Shah', itemDescription: 'Gold Earring - hook replacement', status: 'IN_PROGRESS', promisedDate: '2026-04-05', createdAt: new Date().toISOString() },
  ],
  COMPLETED: [
    { id: 'r7', repairNumber: 'RP/MUM/2603/0012', customerId: 'c7', customerName: 'Sunita Gupta', itemDescription: 'Silver Necklace - re-string', status: 'COMPLETED', promisedDate: '2026-04-04', createdAt: new Date().toISOString() },
  ],
};

export default function RepairsPage() {
  const [viewMode, setViewMode] = React.useState<'board' | 'list'>('board');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repair Queue"
        description="Track and manage repair orders across all stages."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Repairs' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={cn('inline-flex h-9 w-9 items-center justify-center rounded-l-md text-sm', viewMode === 'board' ? 'bg-accent' : '')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn('inline-flex h-9 w-9 items-center justify-center rounded-r-md text-sm', viewMode === 'list' ? 'bg-accent' : '')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Repair
            </button>
          </div>
        }
      />

      {viewMode === 'board' ? (
        <RepairStatusBoard
          columns={mockQueue}
          onItemClick={(id) => { window.location.href = `/retail/repairs/${id}`; }}
        />
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">Repair #</th>
                <th className="px-4 py-2 text-left font-medium">Customer</th>
                <th className="px-4 py-2 text-left font-medium">Description</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Promised Date</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(mockQueue).flat().map((r) => (
                <tr
                  key={r.id}
                  className="border-b cursor-pointer hover:bg-accent"
                  onClick={() => { window.location.href = `/retail/repairs/${r.id}`; }}
                >
                  <td className="px-4 py-2 font-mono">{r.repairNumber}</td>
                  <td className="px-4 py-2">{r.customerName}</td>
                  <td className="px-4 py-2">{r.itemDescription}</td>
                  <td className="px-4 py-2">
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      r.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                      r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-blue-50 text-blue-700',
                    )}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {r.promisedDate ? new Date(r.promisedDate).toLocaleDateString('en-IN') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
