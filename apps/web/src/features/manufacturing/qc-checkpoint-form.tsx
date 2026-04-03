'use client';

import * as React from 'react';

interface QcCheckpointFormProps {
  jobOrderId: string;
  onSubmit: (data: {
    jobOrderId: string;
    checkpointType: string;
    checkedBy: string;
    status: string;
    weightMg?: number;
    purityFineness?: number;
    findings?: string;
  }) => void;
  isLoading?: boolean;
}

const CHECKPOINT_TYPES = ['IN_PROCESS', 'FINAL', 'HALLMARK'] as const;
const QC_STATUSES = ['PASSED', 'FAILED', 'REWORK'] as const;

export function QcCheckpointForm({ jobOrderId, onSubmit, isLoading }: QcCheckpointFormProps) {
  const [checkpointType, setCheckpointType] = React.useState<string>('FINAL');
  const [checkedBy, setCheckedBy] = React.useState('');
  const [status, setStatus] = React.useState<string>('PASSED');
  const [weightMg, setWeightMg] = React.useState('');
  const [purityFineness, setPurityFineness] = React.useState('');
  const [findings, setFindings] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      jobOrderId,
      checkpointType,
      checkedBy,
      status,
      weightMg: weightMg ? Number(weightMg) : undefined,
      purityFineness: purityFineness ? Number(purityFineness) : undefined,
      findings: findings || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Checkpoint Type</label>
          <select
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            value={checkpointType}
            onChange={(e) => setCheckpointType(e.target.value)}
            required
          >
            {CHECKPOINT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
          >
            {QC_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Checked By</label>
        <input
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          value={checkedBy}
          onChange={(e) => setCheckedBy(e.target.value)}
          placeholder="Inspector name"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Weight (mg)</label>
          <input
            type="number"
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            value={weightMg}
            onChange={(e) => setWeightMg(e.target.value)}
            placeholder="Weight in milligrams"
            min={0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Purity Fineness</label>
          <input
            type="number"
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            value={purityFineness}
            onChange={(e) => setPurityFineness(e.target.value)}
            placeholder="e.g., 916 for 22K"
            min={0}
            max={999}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Findings</label>
        <textarea
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[80px]"
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          placeholder="QC observations and notes..."
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !checkedBy}
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? 'Submitting...' : 'Record Checkpoint'}
      </button>
    </form>
  );
}
