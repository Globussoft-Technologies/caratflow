'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { JobTimeline, buildTimelineSteps } from '@/features/manufacturing';
import { User, MapPin, Calendar, Package } from 'lucide-react';

// Placeholder data
const JOB = {
  id: '1',
  jobNumber: 'JO-000001',
  productName: '22K Gold Necklace',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  quantity: 1,
  karigarName: 'Ramesh K.',
  locationName: 'Main Workshop',
  customerName: 'Priya Sharma',
  bomName: '22K Gold Necklace BOM v2',
  estimatedStartDate: '2026-04-02',
  estimatedEndDate: '2026-04-10',
  actualStartDate: '2026-04-03',
  actualEndDate: null,
  createdAt: '2026-04-01',
  notes: 'Custom order for engagement ceremony.',
  specialInstructions: 'Customer wants rose gold finish on clasp.',
  items: [
    { id: '1', description: '22K Gold Wire', requiredWeightMg: 25000, issuedWeightMg: 25000, returnedWeightMg: 0, wastedWeightMg: 500, costPaise: 150000_00 },
    { id: '2', description: '22K Gold Sheet', requiredWeightMg: 10000, issuedWeightMg: 10000, returnedWeightMg: 1500, wastedWeightMg: 200, costPaise: 60000_00 },
    { id: '3', description: 'Ruby 0.5ct Round x3', requiredWeightMg: 300, issuedWeightMg: 300, returnedWeightMg: 0, wastedWeightMg: 0, costPaise: 45000_00 },
  ],
  costs: [
    { id: '1', costType: 'MATERIAL_METAL', description: 'Gold wire + sheet', amountPaise: 210000_00 },
    { id: '2', costType: 'MATERIAL_STONE', description: 'Rubies', amountPaise: 45000_00 },
    { id: '3', costType: 'LABOR', description: 'Making charges (partial)', amountPaise: 45000_00 },
  ],
  qcCheckpoints: [
    { id: '1', checkpointType: 'IN_PROCESS', checkedBy: 'QC Manager', status: 'PASSED', checkedAt: '2026-04-04' },
  ],
};

function formatWeight(mg: number): string {
  return (mg / 1000).toFixed(3) + ' g';
}

export default function JobDetailPage() {
  const timelineSteps = buildTimelineSteps(JOB.status, {
    createdAt: JOB.createdAt,
    actualStartDate: JOB.actualStartDate ?? undefined,
    actualEndDate: JOB.actualEndDate ?? undefined,
  });

  const totalCost = JOB.costs.reduce((sum, c) => sum + c.amountPaise, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Job ${JOB.jobNumber}`}
        description={JOB.productName}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Job Orders', href: '/manufacturing/jobs' },
          { label: JOB.jobNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              label={JOB.status.replace(/_/g, ' ')}
              variant={getStatusVariant(JOB.status)}
            />
            <StatusBadge
              label={JOB.priority}
              variant={JOB.priority === 'URGENT' ? 'danger' : JOB.priority === 'HIGH' ? 'warning' : 'muted'}
              dot={false}
            />
          </div>
        }
      />

      {/* Status Timeline */}
      <div className="rounded-lg border p-6">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Progress</h3>
        <JobTimeline steps={timelineSteps} />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            Karigar
          </div>
          <p className="mt-1 font-medium">{JOB.karigarName ?? 'Unassigned'}</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Location
          </div>
          <p className="mt-1 font-medium">{JOB.locationName}</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Due Date
          </div>
          <p className="mt-1 font-medium">
            {JOB.estimatedEndDate ? new Date(JOB.estimatedEndDate).toLocaleDateString() : '-'}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            Customer
          </div>
          <p className="mt-1 font-medium">{JOB.customerName ?? 'Stock'}</p>
        </div>
      </div>

      {/* Notes */}
      {(JOB.notes || JOB.specialInstructions) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {JOB.notes && (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{JOB.notes}</p>
            </div>
          )}
          {JOB.specialInstructions && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Special Instructions</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">{JOB.specialInstructions}</p>
            </div>
          )}
        </div>
      )}

      {/* Material Issue/Return Log */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Material Log</h2>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Material</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Required</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Issued</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Returned</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Wastage</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Cost</th>
              </tr>
            </thead>
            <tbody>
              {JOB.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">{item.description}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatWeight(item.requiredWeightMg)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatWeight(item.issuedWeightMg)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-600">{formatWeight(item.returnedWeightMg)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-600">{formatWeight(item.wastedWeightMg)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">Rs {(item.costPaise / 100).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Cost Breakdown</h2>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {JOB.costs.map((cost) => (
                <tr key={cost.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    <StatusBadge label={cost.costType.replace(/_/g, ' ')} variant="muted" dot={false} />
                  </td>
                  <td className="px-4 py-2.5">{cost.description}</td>
                  <td className="px-4 py-2.5 text-right font-mono">Rs {(cost.amountPaise / 100).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30">
                <td colSpan={2} className="px-4 py-2 text-right font-semibold">Total</td>
                <td className="px-4 py-2 text-right font-mono font-bold">Rs {(totalCost / 100).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* QC Records */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Quality Checks</h2>
        {JOB.qcCheckpoints.length > 0 ? (
          <div className="space-y-2">
            {JOB.qcCheckpoints.map((qc) => (
              <div key={qc.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <StatusBadge label={qc.checkpointType.replace(/_/g, ' ')} variant="info" dot={false} />
                  <span className="text-sm">Checked by {qc.checkedBy}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{new Date(qc.checkedAt).toLocaleDateString()}</span>
                  <StatusBadge label={qc.status} variant={getStatusVariant(qc.status)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No QC checks recorded yet.</p>
        )}
      </div>
    </div>
  );
}
