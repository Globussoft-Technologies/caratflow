'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { FinancialStatementTable } from '@/features/finance/financial-statement-table';

const mockPnl = {
  fromDate: '2026-04-01',
  toDate: '2026-04-04',
  revenue: [
    { accountId: '1', accountName: 'Gold Jewelry Sales', amount: 1_850_000_00 },
    { accountId: '2', accountName: 'Silver Jewelry Sales', amount: 320_000_00 },
    { accountId: '3', accountName: 'Making Charges Income', amount: 280_000_00 },
  ],
  expenses: [
    { accountId: '4', accountName: 'Cost of Gold', amount: 1_200_000_00 },
    { accountId: '5', accountName: 'Cost of Silver', amount: 180_000_00 },
    { accountId: '6', accountName: 'Making Charges (Karigar)', amount: 210_000_00 },
    { accountId: '7', accountName: 'Rent', amount: 50_000_00 },
    { accountId: '8', accountName: 'Salaries', amount: 120_000_00 },
    { accountId: '9', accountName: 'Utilities', amount: 15_000_00 },
    { accountId: '10', accountName: 'Insurance', amount: 25_000_00 },
    { accountId: '11', accountName: 'Marketing', amount: 20_000_00 },
  ],
  totalRevenue: 2_450_000_00,
  totalExpenses: 1_820_000_00,
  netProfit: 630_000_00,
};

export default function PnlPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss Statement"
        description={`For the period ${mockPnl.fromDate} to ${mockPnl.toDate}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Reports', href: '/finance/reports' },
          { label: 'Profit & Loss' },
        ]}
      />

      <FinancialStatementTable
        title="Statement of Profit and Loss"
        subtitle={`For the period ending ${mockPnl.toDate}`}
        sections={[
          {
            name: 'Revenue',
            rows: mockPnl.revenue.map((r) => ({
              accountName: r.accountName,
              amount: r.amount,
            })),
            total: mockPnl.totalRevenue,
          },
          {
            name: 'Expenses',
            rows: mockPnl.expenses.map((e) => ({
              accountName: e.accountName,
              amount: e.amount,
            })),
            total: mockPnl.totalExpenses,
          },
        ]}
        grandTotal={{
          label: 'Net Profit / (Loss)',
          amount: mockPnl.netProfit,
        }}
      />
    </div>
  );
}
