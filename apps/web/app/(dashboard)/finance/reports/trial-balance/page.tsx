'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';

const mockTrialBalance = {
  asOfDate: '2026-04-04',
  accounts: [
    { accountCode: '1001', accountName: 'Cash on Hand', accountType: 'ASSET', debitTotal: 520_000_00, creditTotal: 200_000_00, balance: 320_000_00 },
    { accountCode: '1002', accountName: 'Bank - SBI', accountType: 'ASSET', debitTotal: 1_245_000_00, creditTotal: 400_000_00, balance: 845_000_00 },
    { accountCode: '1003', accountName: 'Bank - HDFC', accountType: 'ASSET', debitTotal: 420_000_00, creditTotal: 100_000_00, balance: 320_000_00 },
    { accountCode: '1100', accountName: 'Accounts Receivable', accountType: 'ASSET', debitTotal: 850_000_00, creditTotal: 270_000_00, balance: 580_000_00 },
    { accountCode: '2001', accountName: 'Accounts Payable', accountType: 'LIABILITY', debitTotal: 180_000_00, creditTotal: 500_000_00, balance: -320_000_00 },
    { accountCode: '2010', accountName: 'GST Payable', accountType: 'LIABILITY', debitTotal: 0, creditTotal: 45_000_00, balance: -45_000_00 },
    { accountCode: '4001', accountName: 'Sales Revenue', accountType: 'REVENUE', debitTotal: 0, creditTotal: 2_450_000_00, balance: -2_450_000_00 },
    { accountCode: '5001', accountName: 'Cost of Goods Sold', accountType: 'EXPENSE', debitTotal: 1_380_000_00, creditTotal: 0, balance: 1_380_000_00 },
    { accountCode: '5010', accountName: 'Salaries', accountType: 'EXPENSE', debitTotal: 120_000_00, creditTotal: 0, balance: 120_000_00 },
    { accountCode: '5020', accountName: 'Rent', accountType: 'EXPENSE', debitTotal: 50_000_00, creditTotal: 0, balance: 50_000_00 },
  ],
  totalDebits: 4_765_000_00,
  totalCredits: 3_965_000_00,
};

export default function TrialBalancePage() {
  const d = mockTrialBalance;
  const formatAmount = (paise: number) =>
    paise === 0 ? '-' : (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial Balance"
        description={`As of ${d.asOfDate}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Reports', href: '/finance/reports' },
          { label: 'Trial Balance' },
        ]}
      />

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Code</th>
              <th className="px-4 py-2 text-left font-medium">Account Name</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-right font-medium">Debit</th>
              <th className="px-4 py-2 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody>
            {d.accounts.map((acc) => {
              const isDebitBalance = acc.balance >= 0;
              return (
                <tr key={acc.accountCode} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono">{acc.accountCode}</td>
                  <td className="px-4 py-2">{acc.accountName}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{acc.accountType}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {isDebitBalance ? formatAmount(Math.abs(acc.balance)) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {!isDebitBalance ? formatAmount(Math.abs(acc.balance)) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/50">
              <td colSpan={3} className="px-4 py-2 font-bold">Total</td>
              <td className="px-4 py-2 text-right font-mono font-bold">
                {formatAmount(d.accounts.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0))}
              </td>
              <td className="px-4 py-2 text-right font-mono font-bold">
                {formatAmount(Math.abs(d.accounts.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0)))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm">
          {d.totalDebits === d.totalCredits ? (
            <span className="text-emerald-600 font-medium">Trial balance is in equilibrium. Debits equal credits.</span>
          ) : (
            <span className="text-red-600 font-medium">
              Warning: Trial balance does not balance. Difference: {formatAmount(Math.abs(d.totalDebits - d.totalCredits))}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
