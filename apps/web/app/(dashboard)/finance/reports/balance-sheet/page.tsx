'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { FinancialStatementTable } from '@/features/finance/financial-statement-table';

const mockBalanceSheet = {
  asOfDate: '2026-04-04',
  assets: [
    { accountId: '1', accountName: 'Cash on Hand', amount: 320_000_00 },
    { accountId: '2', accountName: 'Bank - SBI', amount: 845_000_00 },
    { accountId: '3', accountName: 'Bank - HDFC', amount: 320_000_00 },
    { accountId: '4', accountName: 'Accounts Receivable', amount: 580_000_00 },
    { accountId: '5', accountName: 'Gold Inventory', amount: 4_500_000_00 },
    { accountId: '6', accountName: 'Silver Inventory', amount: 800_000_00 },
    { accountId: '7', accountName: 'Diamond Inventory', amount: 1_200_000_00 },
    { accountId: '8', accountName: 'Fixed Assets - Shop', amount: 2_500_000_00 },
    { accountId: '9', accountName: 'Fixed Assets - Equipment', amount: 350_000_00 },
  ],
  liabilities: [
    { accountId: '10', accountName: 'Accounts Payable', amount: 320_000_00 },
    { accountId: '11', accountName: 'GST Payable', amount: 45_000_00 },
    { accountId: '12', accountName: 'TDS Payable', amount: 15_000_00 },
    { accountId: '13', accountName: 'Bank Loan - SBI', amount: 1_500_000_00 },
  ],
  equity: [
    { accountId: '14', accountName: 'Capital Account', amount: 8_000_000_00 },
    { accountId: '15', accountName: 'Retained Earnings', amount: 905_000_00 },
    { accountId: '16', accountName: 'Current Year Profit', amount: 630_000_00 },
  ],
  totalAssets: 11_415_000_00,
  totalLiabilities: 1_880_000_00,
  totalEquity: 9_535_000_00,
};

export default function BalanceSheetPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance Sheet"
        description={`As of ${mockBalanceSheet.asOfDate}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Reports', href: '/finance/reports' },
          { label: 'Balance Sheet' },
        ]}
      />

      <FinancialStatementTable
        title="Balance Sheet"
        subtitle={`As at ${mockBalanceSheet.asOfDate}`}
        sections={[
          {
            name: 'Assets',
            rows: mockBalanceSheet.assets.map((a) => ({
              accountName: a.accountName,
              amount: a.amount,
            })),
            total: mockBalanceSheet.totalAssets,
          },
          {
            name: 'Liabilities',
            rows: mockBalanceSheet.liabilities.map((l) => ({
              accountName: l.accountName,
              amount: l.amount,
            })),
            total: mockBalanceSheet.totalLiabilities,
          },
          {
            name: 'Equity',
            rows: mockBalanceSheet.equity.map((e) => ({
              accountName: e.accountName,
              amount: e.amount,
            })),
            total: mockBalanceSheet.totalEquity,
          },
        ]}
        grandTotal={{
          label: 'Liabilities + Equity',
          amount: mockBalanceSheet.totalLiabilities + mockBalanceSheet.totalEquity,
        }}
      />
    </div>
  );
}
