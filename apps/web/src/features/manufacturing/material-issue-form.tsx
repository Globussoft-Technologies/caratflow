'use client';

import * as React from 'react';

interface MaterialIssueFormProps {
  karigarId: string;
  jobOrderId?: string;
  onSubmit: (data: {
    karigarId: string;
    transactionType: string;
    jobOrderId?: string;
    metalType: string;
    purityFineness: number;
    weightMg: number;
    notes?: string;
  }) => void;
  isLoading?: boolean;
  mode: 'ISSUE' | 'RETURN' | 'WASTAGE';
}

const METAL_TYPES = ['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM', 'RHODIUM'] as const;
const COMMON_PURITIES = [
  { label: '24K (999)', value: 999 },
  { label: '22K (916)', value: 916 },
  { label: '18K (750)', value: 750 },
  { label: '14K (585)', value: 585 },
  { label: 'Sterling (925)', value: 925 },
] as const;

const MODE_LABELS = {
  ISSUE: { title: 'Issue Metal', button: 'Issue' },
  RETURN: { title: 'Record Return', button: 'Record Return' },
  WASTAGE: { title: 'Record Wastage', button: 'Record Wastage' },
} as const;

export function MaterialIssueForm({
  karigarId,
  jobOrderId,
  onSubmit,
  isLoading,
  mode,
}: MaterialIssueFormProps) {
  const [metalType, setMetalType] = React.useState('GOLD');
  const [purityFineness, setPurityFineness] = React.useState(916);
  const [weightGrams, setWeightGrams] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const labels = MODE_LABELS[mode];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightMg = Math.round(Number(weightGrams) * 1000);
    if (weightMg <= 0) return;

    onSubmit({
      karigarId,
      transactionType: mode,
      jobOrderId,
      metalType,
      purityFineness,
      weightMg,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold">{labels.title}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Metal Type</label>
          <select
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            value={metalType}
            onChange={(e) => setMetalType(e.target.value)}
          >
            {METAL_TYPES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Purity</label>
          <select
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            value={purityFineness}
            onChange={(e) => setPurityFineness(Number(e.target.value))}
          >
            {COMMON_PURITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Weight (grams)</label>
        <input
          type="number"
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          value={weightGrams}
          onChange={(e) => setWeightGrams(e.target.value)}
          placeholder="Enter weight in grams"
          min={0}
          step={0.001}
          required
        />
        {weightGrams && (
          <p className="mt-1 text-xs text-muted-foreground">
            = {Math.round(Number(weightGrams) * 1000).toLocaleString()} mg
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <input
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !weightGrams}
        className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
          mode === 'WASTAGE'
            ? 'bg-red-600 hover:bg-red-700'
            : mode === 'RETURN'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-primary hover:bg-primary/90'
        }`}
      >
        {isLoading ? 'Processing...' : labels.button}
      </button>
    </form>
  );
}
