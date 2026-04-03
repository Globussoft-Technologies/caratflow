'use client';

import * as React from 'react';
import { Check, X, Link } from 'lucide-react';

interface BankTransaction {
  id: string;
  transactionDate: string;
  description: string;
  debitPaise: number;
  creditPaise: number;
  runningBalancePaise: number;
  reference?: string;
  isReconciled: boolean;
  reconciledAt?: string;
}

interface ReconciliationTableProps {
  transactions: BankTransaction[];
  onManualReconcile?: (transactionId: string) => void;
  isLoading?: boolean;
}

export function ReconciliationTable({
  transactions,
  onManualReconcile,
  isLoading,
}: ReconciliationTableProps) {
  const formatAmount = (paise: number) => {
    if (paise === 0) return '-';
    return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const unreconciledCount = transactions.filter((t) => !t.isReconciled).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {transactions.length} transactions ({unreconciledCount} unreconciled)
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium">Description</th>
              <th className="px-4 py-2 text-left font-medium">Reference</th>
              <th className="px-4 py-2 text-right font-medium">Debit</th>
              <th className="px-4 py-2 text-right font-medium">Credit</th>
              <th className="px-4 py-2 text-right font-medium">Balance</th>
              <th className="px-4 py-2 text-center font-medium">Status</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(txn.transactionDate)}</td>
                  <td className="px-4 py-2 max-w-[200px] truncate">{txn.description}</td>
                  <td className="px-4 py-2 text-muted-foreground">{txn.reference ?? '-'}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatAmount(txn.debitPaise)}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{formatAmount(txn.creditPaise)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatAmount(txn.runningBalancePaise)}</td>
                  <td className="px-4 py-2 text-center">
                    {txn.isReconciled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        <Check className="h-3 w-3" /> Matched
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        <X className="h-3 w-3" /> Unmatched
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {!txn.isReconciled && onManualReconcile && (
                      <button
                        onClick={() => onManualReconcile(txn.id)}
                        className="rounded p-1 text-muted-foreground hover:text-primary"
                        title="Reconcile manually"
                      >
                        <Link className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
