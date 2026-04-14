'use client';

import { PageHeader, EmptyState } from '@caratflow/ui';
import { Landmark } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function BankAccountsPage() {
  const { data, isLoading } = trpc.financial.bank.listAccounts.useQuery();
  const accounts = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Accounts"
        description="Bank ledger and reconciliation."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Bank' },
        ]}
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Account Name</span>
          <span>Account #</span>
          <span>Bank</span>
          <span>Branch</span>
          <span>Balance</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : accounts.length === 0 ? (
          <EmptyState icon={<Landmark className="h-8 w-8" />} title="No bank accounts" />
        ) : (
          <div className="divide-y">
            {accounts.map((a) => (
              <div key={a.id as string} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(a.accountName as string) ?? '-'}</span>
                <span className="font-mono text-xs">{(a.accountNumber as string) ?? '-'}</span>
                <span>{(a.bankName as string) ?? '-'}</span>
                <span>{(a.branch as string) ?? '-'}</span>
                <span className="font-semibold">{formatPaise(a.currentBalancePaise)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
