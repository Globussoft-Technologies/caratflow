'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Plus } from 'lucide-react';
import { RateContractForm } from '../../../../src/features/wholesale/RateContractForm';

const mockContracts = [
  { id: '1', supplierName: 'ABC Gold Refinery', metalType: 'GOLD', ratePerGramPaise: 6500_00, makingChargesPercent: 800, validFrom: '2026-01-01', validTo: '2026-06-30', isActive: true },
  { id: '2', supplierName: 'Silver Craft Ltd', metalType: 'SILVER', ratePerGramPaise: 85_00, makingChargesPercent: 1200, validFrom: '2026-01-01', validTo: '2026-12-31', isActive: true },
  { id: '3', supplierName: 'Platinum Works', metalType: 'PLATINUM', ratePerGramPaise: 3200_00, makingChargesPercent: 1000, validFrom: '2025-07-01', validTo: '2025-12-31', isActive: false },
];

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function RateContractsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rate Contracts"
        description="Supplier rate contracts for metals and making charges."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Rate Contracts' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Contract
          </button>
        }
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-7 gap-4 border-b px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-2">Supplier</div>
          <div>Metal Type</div>
          <div className="text-right">Rate/g</div>
          <div className="text-right">Making %</div>
          <div>Valid Period</div>
          <div>Status</div>
        </div>
        {mockContracts.map((c) => (
          <div key={c.id} className="grid grid-cols-7 gap-4 border-b px-4 py-3 last:border-b-0">
            <div className="col-span-2 text-sm font-medium">{c.supplierName}</div>
            <div className="text-sm">{c.metalType}</div>
            <div className="text-sm text-right font-medium">{formatPaise(c.ratePerGramPaise)}</div>
            <div className="text-sm text-right">{(c.makingChargesPercent / 100).toFixed(2)}%</div>
            <div className="text-sm text-muted-foreground">
              {new Date(c.validFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} - {new Date(c.validTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
            </div>
            <div>
              <StatusBadge
                label={c.isActive ? 'Active' : 'Expired'}
                variant={c.isActive ? 'success' : 'secondary'}
                dot
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
