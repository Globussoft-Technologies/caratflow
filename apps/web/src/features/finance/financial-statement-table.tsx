'use client';

import * as React from 'react';

interface StatementRow {
  accountId?: string;
  accountName: string;
  amount: number; // in paise
  isHeader?: boolean;
  indent?: number;
}

interface FinancialStatementTableProps {
  title: string;
  subtitle?: string;
  sections: Array<{
    name: string;
    rows: StatementRow[];
    total: number;
  }>;
  grandTotal?: { label: string; amount: number };
}

export function FinancialStatementTable({
  title,
  subtitle,
  sections,
  grandTotal,
}: FinancialStatementTableProps) {
  const formatAmount = (paise: number) => {
    const isNegative = paise < 0;
    const formatted = (Math.abs(paise) / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return isNegative ? `(${formatted})` : formatted;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Account</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, sIdx) => (
              <React.Fragment key={sIdx}>
                <tr className="bg-muted/30">
                  <td colSpan={2} className="px-4 py-2 font-semibold text-foreground">
                    {section.name}
                  </td>
                </tr>
                {section.rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-8 py-2 text-muted-foreground italic">
                      No entries
                    </td>
                  </tr>
                ) : (
                  section.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b">
                      <td
                        className="px-4 py-1.5"
                        style={{ paddingLeft: `${(row.indent ?? 1) * 24}px` }}
                      >
                        {row.isHeader ? (
                          <span className="font-medium">{row.accountName}</span>
                        ) : (
                          row.accountName
                        )}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono">
                        {formatAmount(row.amount)}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="border-b bg-muted/20">
                  <td className="px-4 py-1.5 font-semibold">Total {section.name}</td>
                  <td className="px-4 py-1.5 text-right font-mono font-semibold">
                    {formatAmount(section.total)}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
          {grandTotal && (
            <tfoot>
              <tr className="border-t-2 bg-muted/50">
                <td className="px-4 py-2 text-base font-bold">{grandTotal.label}</td>
                <td className="px-4 py-2 text-right font-mono text-base font-bold">
                  {formatAmount(grandTotal.amount)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
