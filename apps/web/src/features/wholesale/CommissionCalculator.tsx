'use client';

import { useState } from 'react';
import { X, Calculator } from 'lucide-react';

interface CommissionCalculatorProps {
  onClose: () => void;
}

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function CommissionCalculator({ onClose }: CommissionCalculatorProps) {
  const [agentId, setAgentId] = useState('');
  const [referenceType, setReferenceType] = useState('SALE');
  const [orderValueRs, setOrderValueRs] = useState('');
  const [commissionRate, setCommissionRate] = useState('2.50');
  const [commissionType, setCommissionType] = useState('PERCENTAGE');

  const orderValuePaise = Math.round((parseFloat(orderValueRs) || 0) * 100);
  let calculatedCommissionPaise = 0;

  if (commissionType === 'PERCENTAGE') {
    const ratePercent = parseFloat(commissionRate) || 0;
    calculatedCommissionPaise = Math.round((orderValuePaise * ratePercent) / 100);
  } else {
    calculatedCommissionPaise = Math.round((parseFloat(commissionRate) || 0) * 100);
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Commission Calculator</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Agent *</label>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select agent...</option>
            <option value="a1">Vijay Kumar (2.5%)</option>
            <option value="a2">Suresh Patel (Fixed/order)</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Reference Type</label>
          <select
            value={referenceType}
            onChange={(e) => setReferenceType(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="SALE">Sale</option>
            <option value="PURCHASE">Purchase</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Order Value (Rs)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={orderValueRs}
            onChange={(e) => setOrderValueRs(e.target.value)}
            placeholder="Enter order value..."
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Commission Type</label>
          <select
            value={commissionType}
            onChange={(e) => setCommissionType(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_PER_ORDER">Fixed per Order</option>
            <option value="FIXED_PER_UNIT">Fixed per Unit</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">
            {commissionType === 'PERCENTAGE' ? 'Rate (%)' : 'Amount (Rs)'}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
      </div>

      {/* Result */}
      <div className="rounded-lg bg-muted/50 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Calculated Commission</p>
          <p className="text-2xl font-bold">{formatPaise(calculatedCommissionPaise)}</p>
        </div>
        <button
          disabled={!agentId || calculatedCommissionPaise === 0}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Record Commission
        </button>
      </div>
    </div>
  );
}
