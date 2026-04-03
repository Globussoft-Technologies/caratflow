'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';

const mockAgent = {
  id: '1',
  name: 'Rajesh Broker',
  phone: '+91 9876543210',
  email: 'rajesh@broker.com',
  commissionType: 'PERCENTAGE',
  commissionRate: 250,
  isActive: true,
  panNumber: 'ABCDE1234F',
  totalCommissionPaise: 125000_00,
  pendingCommissionPaise: 45000_00,
  commissions: [
    { id: 'c1', referenceType: 'SALE', referenceId: 'ref-1', amountPaise: 25000_00, status: 'PAID', paidAt: '2026-03-15', createdAt: '2026-03-10' },
    { id: 'c2', referenceType: 'PURCHASE', referenceId: 'ref-2', amountPaise: 35000_00, status: 'APPROVED', paidAt: null, createdAt: '2026-03-20' },
    { id: 'c3', referenceType: 'SALE', referenceId: 'ref-3', amountPaise: 45000_00, status: 'PENDING', paidAt: null, createdAt: '2026-04-01' },
  ],
};

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export default function AgentDetailPage() {
  const a = mockAgent;

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.name}
        description={`Agent/Broker - ${a.commissionType === 'PERCENTAGE' ? `${(a.commissionRate / 100).toFixed(2)}% commission` : 'Fixed commission'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Agents', href: '/wholesale/agents' },
          { label: a.name },
        ]}
        actions={
          <StatusBadge label={a.isActive ? 'Active' : 'Inactive'} variant={a.isActive ? 'success' : 'secondary'} dot />
        }
      />

      {/* Agent Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Contact</p>
          <p className="text-sm font-medium mt-1">{a.phone}</p>
          <p className="text-sm text-muted-foreground">{a.email}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Commission</p>
          <p className="text-lg font-semibold mt-1">{formatPaise(a.totalCommissionPaise)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Pending Commission</p>
          <p className="text-lg font-semibold mt-1">{formatPaise(a.pendingCommissionPaise)}</p>
        </div>
      </div>

      {/* Commission History */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Commission History</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-5 gap-4 border-b px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div>Type</div>
            <div>Reference</div>
            <div className="text-right">Amount</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          {a.commissions.map((c) => (
            <div key={c.id} className="grid grid-cols-5 gap-4 border-b px-4 py-3 last:border-b-0">
              <div className="text-sm">{c.referenceType}</div>
              <div className="text-sm font-mono">{c.referenceId.substring(0, 8)}...</div>
              <div className="text-sm text-right font-medium">{formatPaise(c.amountPaise)}</div>
              <div>
                <StatusBadge label={c.status} variant={getStatusVariant(c.status)} dot={false} />
              </div>
              <div className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
