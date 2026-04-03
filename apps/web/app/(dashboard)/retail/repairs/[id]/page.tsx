'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { ArrowRight } from 'lucide-react';

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// Mock repair detail
const mockRepair = {
  id: 'r5',
  repairNumber: 'RP/MUM/2604/0002',
  customerName: 'Meera Patel',
  customerPhone: '+91 98765 11111',
  locationName: 'Mumbai Showroom',
  status: 'IN_PROGRESS',
  itemDescription: 'Platinum Ring - polishing + stone setting',
  itemWeightMg: 8500,
  diagnosticNotes: 'Ring needs rhodium plating and one prong is loose. Stone (0.5ct diamond) needs re-setting.',
  estimatePaise: 350000,
  actualCostPaise: null,
  laborPaise: 200000,
  materialPaise: 50000,
  promisedDate: '2026-04-06',
  completedDate: null,
  deliveredDate: null,
  createdAt: '2026-03-28T10:00:00Z',
  timeline: [
    { status: 'RECEIVED', date: '2026-03-28', note: 'Item received from customer' },
    { status: 'DIAGNOSED', date: '2026-03-29', note: 'Loose prong, needs rhodium plating' },
    { status: 'QUOTED', date: '2026-03-29', note: 'Estimate: ₹3,500' },
    { status: 'APPROVED', date: '2026-03-30', note: 'Customer approved quote' },
    { status: 'IN_PROGRESS', date: '2026-04-01', note: 'Work started by karigar Raju' },
  ],
};

const STATUS_ORDER = ['RECEIVED', 'DIAGNOSED', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'];

export default function RepairDetailPage() {
  const r = mockRepair;
  const currentIndex = STATUS_ORDER.indexOf(r.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Repair ${r.repairNumber}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Repairs', href: '/retail/repairs' },
          { label: r.repairNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge label={r.status.replace('_', ' ')} variant={getStatusVariant(r.status)} />
            {currentIndex < STATUS_ORDER.length - 1 && r.status !== 'CANCELLED' && (
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Move to {STATUS_ORDER[currentIndex + 1]?.replace('_', ' ')}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        }
      />

      {/* Status Progress */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status, i) => (
          <div key={status} className="flex items-center">
            <div className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
              i <= currentIndex
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {status.replace('_', ' ')}
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div className={`mx-1 h-0.5 w-6 ${i < currentIndex ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
          <p className="mt-1 font-medium">{r.customerName}</p>
          <p className="text-sm text-muted-foreground">{r.customerPhone}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Item</h3>
          <p className="mt-1 font-medium">{r.itemDescription}</p>
          <p className="text-sm text-muted-foreground">Weight: {(r.itemWeightMg / 1000).toFixed(3)}g</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Promised Date</h3>
          <p className="mt-1 font-medium">
            {r.promisedDate ? new Date(r.promisedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
          </p>
        </div>
      </div>

      {/* Diagnosis + Cost */}
      <div className="grid gap-4 lg:grid-cols-2">
        {r.diagnosticNotes && (
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Diagnostic Notes</h3>
            <p className="mt-1 whitespace-pre-wrap">{r.diagnosticNotes}</p>
          </div>
        )}
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Cost Breakdown</h3>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Estimate</span>
              <span className="font-medium">{r.estimatePaise ? formatPaise(r.estimatePaise) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Labor</span>
              <span>{r.laborPaise ? formatPaise(r.laborPaise) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Materials</span>
              <span>{r.materialPaise ? formatPaise(r.materialPaise) : '-'}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-medium">
              <span>Actual Cost</span>
              <span>{r.actualCostPaise ? formatPaise(r.actualCostPaise) : 'TBD'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Timeline</h3>
        <div className="space-y-3">
          {r.timeline.map((entry, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                {i < r.timeline.length - 1 && <div className="flex-1 w-0.5 bg-border" />}
              </div>
              <div className="pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{entry.status.replace('_', ' ')}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{entry.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
