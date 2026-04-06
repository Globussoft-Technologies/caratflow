'use client';

import * as React from 'react';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Plus, Settings, ToggleLeft, ToggleRight } from 'lucide-react';

interface ProviderRow {
  id: string;
  providerName: string;
  displayName: string;
  isActive: boolean;
  minOrderPaise: number;
  maxOrderPaise: number;
  supportedTenures: number[];
  processingFeePct: number;
  activeTransactions: number;
}

const mockProviders: ProviderRow[] = [
  {
    id: '1',
    providerName: 'BAJAJ_FINSERV',
    displayName: 'Bajaj Finserv No Cost EMI',
    isActive: true,
    minOrderPaise: 300000_00,
    maxOrderPaise: 5000000_00,
    supportedTenures: [3, 6, 9, 12, 18, 24],
    processingFeePct: 200,
    activeTransactions: 12,
  },
  {
    id: '2',
    providerName: 'HDFC_FLEXIPAY',
    displayName: 'HDFC FlexiPay',
    isActive: true,
    minOrderPaise: 100000_00,
    maxOrderPaise: 2000000_00,
    supportedTenures: [3, 6, 9, 12],
    processingFeePct: 150,
    activeTransactions: 8,
  },
  {
    id: '3',
    providerName: 'SIMPL',
    displayName: 'Simpl Pay Later',
    isActive: true,
    minOrderPaise: 10000_00,
    maxOrderPaise: 500000_00,
    supportedTenures: [3],
    processingFeePct: 0,
    activeTransactions: 3,
  },
  {
    id: '4',
    providerName: 'LAZYPAY',
    displayName: 'LazyPay',
    isActive: false,
    minOrderPaise: 10000_00,
    maxOrderPaise: 300000_00,
    supportedTenures: [3, 6],
    processingFeePct: 0,
    activeTransactions: 1,
  },
];

function formatCurrency(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

function formatFeePct(pct: number): string {
  return `${(pct / 100).toFixed(pct % 100 === 0 ? 0 : 2)}%`;
}

export default function BnplProvidersPage() {
  const [showForm, setShowForm] = React.useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="BNPL Providers"
        description="Configure Buy Now Pay Later provider integrations."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'BNPL & EMI', href: '/finance/bnpl' },
          { label: 'Providers' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Provider
          </button>
        }
      />

      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Add BNPL Provider</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Provider</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Select provider...</option>
                <option value="SIMPL">Simpl</option>
                <option value="LAZYPAY">LazyPay</option>
                <option value="ZESTMONEY">ZestMoney</option>
                <option value="BAJAJ_FINSERV">Bajaj Finserv</option>
                <option value="HDFC_FLEXIPAY">HDFC FlexiPay</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Display Name</label>
              <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g., Bajaj Finserv EMI" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">API Key</label>
              <input type="password" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Provider API key" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">API Secret</label>
              <input type="password" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Provider API secret" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Min Order Amount</label>
              <input type="number" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="1000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Max Order Amount</label>
              <input type="number" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="500000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Supported Tenures (months)</label>
              <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="3, 6, 9, 12" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Processing Fee %</label>
              <input type="number" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="2" step="0.01" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save Provider
            </button>
          </div>
        </div>
      )}

      {/* Providers Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mockProviders.map((provider) => (
          <div key={provider.id} className="rounded-lg border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold">{provider.displayName}</h4>
                <span className="text-xs text-muted-foreground">{provider.providerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={provider.isActive ? 'ACTIVE' : 'INACTIVE'} />
                <button className="rounded p-1 hover:bg-muted" title="Settings">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  className="rounded p-1 hover:bg-muted"
                  title={provider.isActive ? 'Disable' : 'Enable'}
                >
                  {provider.isActive ? (
                    <ToggleRight className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Min Amount</span>
                <p className="font-mono font-medium">{formatCurrency(provider.minOrderPaise)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Max Amount</span>
                <p className="font-mono font-medium">{formatCurrency(provider.maxOrderPaise)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tenures</span>
                <p className="font-medium">{provider.supportedTenures.map((t) => `${t}m`).join(', ')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Processing Fee</span>
                <p className="font-medium">{formatFeePct(provider.processingFeePct)}</p>
              </div>
            </div>

            <div className="mt-3 border-t pt-3">
              <span className="text-xs text-muted-foreground">
                {provider.activeTransactions} active transaction{provider.activeTransactions !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
