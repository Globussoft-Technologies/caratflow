'use client';

import { useState } from 'react';

interface RateContractFormProps {
  onSubmit?: (data: Record<string, unknown>) => void;
  initialData?: {
    supplierId?: string;
    metalType?: string;
    ratePerGramPaise?: number;
    makingChargesPercent?: number;
    validFrom?: string;
    validTo?: string;
    terms?: string;
  };
}

export function RateContractForm({ onSubmit, initialData }: RateContractFormProps) {
  const [supplierId, setSupplierId] = useState(initialData?.supplierId ?? '');
  const [metalType, setMetalType] = useState(initialData?.metalType ?? 'GOLD');
  const [ratePerGram, setRatePerGram] = useState(
    initialData?.ratePerGramPaise ? (initialData.ratePerGramPaise / 100).toFixed(2) : '',
  );
  const [makingPercent, setMakingPercent] = useState(
    initialData?.makingChargesPercent ? (initialData.makingChargesPercent / 100).toFixed(2) : '',
  );
  const [validFrom, setValidFrom] = useState(initialData?.validFrom ?? '');
  const [validTo, setValidTo] = useState(initialData?.validTo ?? '');
  const [terms, setTerms] = useState(initialData?.terms ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({
      supplierId,
      metalType,
      ratePerGramPaise: Math.round(parseFloat(ratePerGram || '0') * 100),
      makingChargesPercent: Math.round(parseFloat(makingPercent || '0') * 100),
      validFrom,
      validTo,
      terms,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium mb-1.5">Supplier</label>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          required
        >
          <option value="">Select Supplier...</option>
          <option value="s1">ABC Gold Refinery</option>
          <option value="s2">Silver Craft Ltd</option>
          <option value="s3">Platinum Works</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Metal Type</label>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={metalType}
          onChange={(e) => setMetalType(e.target.value)}
        >
          <option value="GOLD">Gold</option>
          <option value="SILVER">Silver</option>
          <option value="PLATINUM">Platinum</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Rate per Gram (INR)</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="6500.00"
            value={ratePerGram}
            onChange={(e) => setRatePerGram(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Making Charges (%)</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="8.00"
            value={makingPercent}
            onChange={(e) => setMakingPercent(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Valid From</label>
          <input
            type="date"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Valid To</label>
          <input
            type="date"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Terms</label>
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={3}
          placeholder="Contract terms and conditions..."
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Save Contract
        </button>
      </div>
    </form>
  );
}
