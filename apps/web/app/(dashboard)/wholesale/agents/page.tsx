'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Users } from 'lucide-react';
import { CommissionCalculator } from '@/features/wholesale';

const mockAgents = [
  { id: '1', name: 'Vijay Kumar', phone: '+91 98765 43210', email: 'vijay@broker.com', commissionType: 'PERCENTAGE', commissionValue: 250, isActive: true, totalCommissionPaise: 450000_00, pendingCommissionPaise: 120000_00 },
  { id: '2', name: 'Suresh Patel', phone: '+91 87654 32100', email: null, commissionType: 'FIXED_PER_ORDER', commissionValue: 5000_00, isActive: true, totalCommissionPaise: 250000_00, pendingCommissionPaise: 50000_00 },
  { id: '3', name: 'Ravi Sharma', phone: '+91 76543 21000', email: 'ravi@agents.in', commissionType: 'PERCENTAGE', commissionValue: 150, isActive: false, totalCommissionPaise: 180000_00, pendingCommissionPaise: 0 },
];

const mockCommissions = [
  { id: 'c1', agentName: 'Vijay Kumar', referenceType: 'SALE', orderValuePaise: 2400000_00, commissionPaise: 60000_00, status: 'CALCULATED', createdAt: '2026-04-03' },
  { id: 'c2', agentName: 'Vijay Kumar', referenceType: 'PURCHASE', orderValuePaise: 1200000_00, commissionPaise: 30000_00, status: 'APPROVED', createdAt: '2026-04-01' },
  { id: 'c3', agentName: 'Suresh Patel', referenceType: 'SALE', orderValuePaise: 800000_00, commissionPaise: 5000_00, status: 'PAID', createdAt: '2026-03-28' },
];

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function formatCommissionType(type: string, value: number): string {
  switch (type) {
    case 'PERCENTAGE':
      return `${(value / 100).toFixed(2)}%`;
    case 'FIXED_PER_UNIT':
      return `${formatPaise(value)}/unit`;
    case 'FIXED_PER_ORDER':
      return `${formatPaise(value)}/order`;
    default:
      return String(value);
  }
}

export default function AgentsPage() {
  const [showCalculator, setShowCalculator] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents & Brokers"
        description="Manage agents, calculate commissions, and track payouts."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Agents' },
        ]}
        actions={
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Agent
          </button>
        }
      />

      {showCalculator && (
        <CommissionCalculator onClose={() => setShowCalculator(false)} />
      )}

      {/* Agent List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Agents</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Name</span>
            <span>Commission</span>
            <span>Total Earned</span>
            <span>Pending</span>
            <span>Status</span>
            <span>Contact</span>
          </div>
          <div className="divide-y">
            {mockAgents.map((agent) => (
              <div
                key={agent.id}
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 text-sm"
              >
                <span className="font-medium">{agent.name}</span>
                <span>{formatCommissionType(agent.commissionType, agent.commissionValue)}</span>
                <span className="font-semibold">{formatPaise(agent.totalCommissionPaise)}</span>
                <span className={agent.pendingCommissionPaise > 0 ? 'text-amber-600 font-medium' : ''}>
                  {formatPaise(agent.pendingCommissionPaise)}
                </span>
                <span>
                  <StatusBadge
                    label={agent.isActive ? 'Active' : 'Inactive'}
                    variant={agent.isActive ? 'success' : 'default'}
                    dot={false}
                  />
                </span>
                <span className="text-muted-foreground text-xs">{agent.phone}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Commissions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Commissions</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Agent</span>
            <span>Type</span>
            <span>Order Value</span>
            <span>Commission</span>
            <span>Status</span>
            <span>Date</span>
          </div>
          <div className="divide-y">
            {mockCommissions.map((comm) => (
              <div
                key={comm.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm"
              >
                <span className="font-medium">{comm.agentName}</span>
                <span className="text-muted-foreground">{comm.referenceType}</span>
                <span>{formatPaise(comm.orderValuePaise)}</span>
                <span className="font-semibold">{formatPaise(comm.commissionPaise)}</span>
                <span>
                  <StatusBadge
                    label={comm.status}
                    variant={getStatusVariant(comm.status)}
                    dot={false}
                  />
                </span>
                <span className="text-muted-foreground">
                  {new Date(comm.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
