'use client';

import * as React from 'react';
import { PageHeader, StatCard } from '@caratflow/ui';
import { Landmark, Plus, RefreshCw, Upload } from 'lucide-react';
import { ReconciliationTable } from '@/features/finance/reconciliation-table';

const mockBankAccounts = [
  { id: 'ba-1', bankName: 'State Bank of India', accountNumber: '****5678', branchName: 'Zaveri Bazaar Branch', currentBalancePaise: 845000_00, isDefault: true },
  { id: 'ba-2', bankName: 'HDFC Bank', accountNumber: '****9012', branchName: 'Fort Branch', currentBalancePaise: 320000_00, isDefault: false },
];

const mockTransactions = [
  { id: 't1', transactionDate: '2026-04-03', description: 'NEFT-Priya Sharma-INV0012', debitPaise: 0, creditPaise: 100000_00, runningBalancePaise: 845000_00, reference: 'NEFT/040326/001', isReconciled: true, reconciledAt: '2026-04-03' },
  { id: 't2', transactionDate: '2026-04-02', description: 'UPI-RAJESHGOLD-PO0005', debitPaise: 200000_00, creditPaise: 0, runningBalancePaise: 745000_00, reference: 'UPI/040226/045', isReconciled: true },
  { id: 't3', transactionDate: '2026-04-02', description: 'POS-Card Payment-Amit Patel', debitPaise: 0, creditPaise: 50000_00, runningBalancePaise: 945000_00, reference: 'POS/040226/012', isReconciled: false },
  { id: 't4', transactionDate: '2026-04-01', description: 'Cash Deposit', debitPaise: 0, creditPaise: 25000_00, runningBalancePaise: 895000_00, reference: '', isReconciled: false },
  { id: 't5', transactionDate: '2026-04-01', description: 'Rent Payment - Shop', debitPaise: 50000_00, creditPaise: 0, runningBalancePaise: 870000_00, reference: 'NEFT/040126/089', isReconciled: false },
];

export default function BankPage() {
  const [selectedAccount, setSelectedAccount] = React.useState(mockBankAccounts[0]!.id);

  const formatAmount = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banking"
        description="Bank accounts, statement import, and reconciliation."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Banking' },
        ]}
        actions={
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <Upload className="h-4 w-4" /> Import Statement
            </button>
            <button className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <RefreshCw className="h-4 w-4" /> Auto-Reconcile
            </button>
            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Add Bank Account
            </button>
          </div>
        }
      />

      {/* Bank Account Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {mockBankAccounts.map((account) => (
          <button
            key={account.id}
            onClick={() => setSelectedAccount(account.id)}
            className={`rounded-lg border p-4 text-left transition-all ${
              selectedAccount === account.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'bg-card hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Landmark className="h-8 w-8 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">{account.bankName}</h3>
                  <p className="text-sm text-muted-foreground">
                    A/C {account.accountNumber} | {account.branchName}
                  </p>
                </div>
              </div>
              {account.isDefault && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Default
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-xl font-bold">{formatAmount(account.currentBalancePaise)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Transactions / Reconciliation */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">
          Bank Transactions - {mockBankAccounts.find((a) => a.id === selectedAccount)?.bankName}
        </h3>
        <ReconciliationTable
          transactions={mockTransactions}
          onManualReconcile={(id) => console.log('Reconcile:', id)}
        />
      </div>
    </div>
  );
}
