'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { QcCheckpointForm } from '@/features/manufacturing';

// Placeholder data
const PENDING_QC = [
  { id: '1', jobNumber: 'JO-000004', productName: 'Silver Temple Jewellery', karigarName: 'Dinesh P.', locationName: 'Main Workshop', updatedAt: '2026-04-03' },
  { id: '2', jobNumber: 'JO-000006', productName: '24K Gold Coin', karigarName: 'Suresh M.', locationName: 'Main Workshop', updatedAt: '2026-04-04' },
  { id: '3', jobNumber: 'JO-000008', productName: '22K Gold Earrings', karigarName: 'Ramesh K.', locationName: 'Branch Workshop', updatedAt: '2026-04-04' },
];

const RECENT_RESULTS = [
  { id: '1', jobNumber: 'JO-000005', productName: '22K Gold Chain', checkpointType: 'FINAL', checkedBy: 'QC Manager', status: 'PASSED', checkedAt: '2026-04-03' },
  { id: '2', jobNumber: 'JO-000003', productName: '22K Gold Bangle Set', checkpointType: 'IN_PROCESS', checkedBy: 'QC Manager', status: 'PASSED', checkedAt: '2026-04-02' },
  { id: '3', jobNumber: 'JO-000007', productName: '18K Diamond Pendant', checkpointType: 'FINAL', checkedBy: 'QC Manager', status: 'FAILED', checkedAt: '2026-04-02' },
];

export default function QcPage() {
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        description="Manage quality checkpoints and inspections."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Quality Control' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending QC Queue */}
        <div>
          <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Pending QC ({PENDING_QC.length})
          </h2>
          <div className="space-y-2">
            {PENDING_QC.map((job) => (
              <div
                key={job.id}
                className={`cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50 ${selectedJobId === job.id ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setSelectedJobId(job.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm text-muted-foreground">{job.jobNumber}</span>
                    <p className="font-medium">{job.productName}</p>
                  </div>
                  <StatusBadge label="QC PENDING" variant="warning" />
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Karigar: {job.karigarName}</span>
                  <span>{job.locationName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QC Form */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Record Checkpoint</h2>
          {selectedJobId ? (
            <div className="rounded-lg border p-4">
              <QcCheckpointForm
                jobOrderId={selectedJobId}
                onSubmit={(data) => {
                  console.log('QC checkpoint:', data);
                  setSelectedJobId(null);
                }}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Select a job from the pending queue to record a QC checkpoint.
            </div>
          )}
        </div>
      </div>

      {/* Recent Results */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent QC Results</h2>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Job</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Checked By</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_RESULTS.map((result) => (
                <tr key={result.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-mono">{result.jobNumber}</td>
                  <td className="px-4 py-2.5">{result.productName}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge label={result.checkpointType.replace('_', ' ')} variant="info" dot={false} />
                  </td>
                  <td className="px-4 py-2.5">{result.checkedBy}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge label={result.status} variant={getStatusVariant(result.status)} />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(result.checkedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
