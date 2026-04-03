'use client';

import * as React from 'react';
import { StatusBadge } from '@caratflow/ui';

interface MetalBalanceRow {
  id: string;
  metalType: string;
  purityFineness: number;
  issuedWeightMg: number;
  returnedWeightMg: number;
  wastedWeightMg: number;
  balanceWeightMg: number;
}

interface MetalBalanceLedgerProps {
  balances: MetalBalanceRow[];
  karigarName?: string;
}

function formatWeight(mg: number): string {
  return (mg / 1000).toFixed(3) + ' g';
}

function getPurityLabel(fineness: number): string {
  const map: Record<number, string> = { 999: '24K', 916: '22K', 750: '18K', 585: '14K' };
  return map[fineness] ?? `${fineness}`;
}

export function MetalBalanceLedger({ balances, karigarName }: MetalBalanceLedgerProps) {
  return (
    <div className="space-y-3">
      {karigarName && (
        <h3 className="text-sm font-semibold text-muted-foreground">
          Metal Balance for {karigarName}
        </h3>
      )}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Metal</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Purity</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Issued</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Returned</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Wastage</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Balance</th>
            </tr>
          </thead>
          <tbody>
            {balances.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No metal balances recorded.
                </td>
              </tr>
            ) : (
              balances.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      label={row.metalType}
                      variant={row.metalType === 'GOLD' ? 'warning' : row.metalType === 'SILVER' ? 'muted' : 'info'}
                      dot={false}
                    />
                  </td>
                  <td className="px-4 py-2.5">{getPurityLabel(row.purityFineness)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatWeight(row.issuedWeightMg)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-600">{formatWeight(row.returnedWeightMg)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-600">{formatWeight(row.wastedWeightMg)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">{formatWeight(row.balanceWeightMg)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
