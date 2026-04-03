'use client';

import * as React from 'react';
import { cn } from '@caratflow/ui';

interface OldGoldCalculatorProps {
  onCalculate: (result: {
    grossWeightMg: number;
    netWeightMg: number;
    purityFineness: number;
    ratePaisePer10g: number;
    totalValuePaise: number;
    finalAmountPaise: number;
  }) => void;
  className?: string;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OldGoldCalculator({ onCalculate, className }: OldGoldCalculatorProps) {
  const [grossWeightG, setGrossWeightG] = React.useState('');
  const [stoneWeightG, setStoneWeightG] = React.useState('');
  const [purity, setPurity] = React.useState('916');
  const [ratePer10g, setRatePer10g] = React.useState('');

  const grossWeightMg = Math.round(parseFloat(grossWeightG || '0') * 1000);
  const stoneWeightMg = Math.round(parseFloat(stoneWeightG || '0') * 1000);
  const netWeightMg = Math.max(0, grossWeightMg - stoneWeightMg);
  const purityFineness = parseInt(purity || '0', 10);
  const ratePaisePer10g = Math.round(parseFloat(ratePer10g || '0') * 100);

  // Value = (netWeight / 10g) * rate * (purity/999)
  const weightIn10g = netWeightMg / 10000;
  const purityFactor = purityFineness / 999;
  const totalValuePaise = Math.round(weightIn10g * ratePaisePer10g * purityFactor);

  const handleCalculate = () => {
    onCalculate({
      grossWeightMg,
      netWeightMg,
      purityFineness,
      ratePaisePer10g,
      totalValuePaise,
      finalAmountPaise: totalValuePaise,
    });
  };

  return (
    <div className={cn('rounded-lg border p-4 space-y-4', className)}>
      <h3 className="font-semibold">Old Gold Calculator</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Gross Weight (g)</label>
          <input
            type="number"
            step="0.001"
            value={grossWeightG}
            onChange={(e) => setGrossWeightG(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Stone Weight (g)</label>
          <input
            type="number"
            step="0.001"
            value={stoneWeightG}
            onChange={(e) => setStoneWeightG(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Purity (Fineness)</label>
          <select
            value={purity}
            onChange={(e) => setPurity(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="999">24K (999)</option>
            <option value="916">22K (916)</option>
            <option value="750">18K (750)</option>
            <option value="585">14K (585)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Rate per 10g (₹)</label>
          <input
            type="number"
            value={ratePer10g}
            onChange={(e) => setRatePer10g(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Live calculation */}
      <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Net Weight</span>
          <span>{(netWeightMg / 1000).toFixed(3)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Purity Factor</span>
          <span>{(purityFactor * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between border-t pt-1 font-bold">
          <span>Estimated Value</span>
          <span>{formatPaise(totalValuePaise)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCalculate}
        disabled={totalValuePaise <= 0}
        className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Apply Value
      </button>
    </div>
  );
}
