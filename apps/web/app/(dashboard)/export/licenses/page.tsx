'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Shield } from 'lucide-react';
import { LicenseUtilizationBar } from '../../../../src/features/export/LicenseUtilizationBar';

const licenses = [
  { id: '1', licenseNumber: 'DGFT-2025-001', licenseType: 'RODTEP', issuedDate: '2025-04-01', expiryDate: '2026-09-30', valuePaise: 5000000_00, usedValuePaise: 3200000_00, status: 'ACTIVE' },
  { id: '2', licenseNumber: 'DGFT-2025-002', licenseType: 'MEIS', issuedDate: '2025-06-15', expiryDate: '2026-06-14', valuePaise: 2000000_00, usedValuePaise: 1800000_00, status: 'ACTIVE' },
  { id: '3', licenseNumber: 'DGFT-2024-010', licenseType: 'EPCG', issuedDate: '2024-01-10', expiryDate: '2026-01-09', valuePaise: 3000000_00, usedValuePaise: 3000000_00, status: 'UTILIZED' },
  { id: '4', licenseNumber: 'DGFT-2024-005', licenseType: 'ADVANCE_LICENSE', issuedDate: '2024-04-01', expiryDate: '2025-03-31', valuePaise: 1500000_00, usedValuePaise: 800000_00, status: 'EXPIRED' },
];

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export default function DgftLicensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="DGFT Licenses"
        description="Track DGFT license utilization, balances, and expiry dates."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Licenses' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add License
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {licenses.map((lic) => {
          const utilizationPercent = Math.round((lic.usedValuePaise / lic.valuePaise) * 100);
          const balance = lic.valuePaise - lic.usedValuePaise;
          const isExpiringSoon = new Date(lic.expiryDate).getTime() - Date.now() < 90 * 86400000;

          return (
            <div key={lic.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold font-mono">{lic.licenseNumber}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{lic.licenseType.replace(/_/g, ' ')}</span>
                </div>
                <StatusBadge label={lic.status} variant={getStatusVariant(lic.status)} dot={false} />
              </div>

              <LicenseUtilizationBar percent={utilizationPercent} />

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold">{formatPaise(lic.valuePaise)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Used</p>
                  <p className="font-semibold">{formatPaise(lic.usedValuePaise)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Balance</p>
                  <p className="font-semibold">{formatPaise(balance)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Issued: {new Date(lic.issuedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span className={isExpiringSoon && lic.status === 'ACTIVE' ? 'text-amber-600 font-medium' : ''}>
                  Expires: {new Date(lic.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
