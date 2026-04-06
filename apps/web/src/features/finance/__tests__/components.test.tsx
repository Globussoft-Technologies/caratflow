import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Finance Feature Components', () => {
  describe('JournalEntryForm', () => {
    const mockAccounts = [
      { id: 'a1', accountCode: '1001', name: 'Cash' },
      { id: 'a2', accountCode: '4001', name: 'Sales Revenue' },
    ];

    it('renders form with date and description fields', async () => {
      const { JournalEntryForm } = await import('../journal-entry-form');
      render(<JournalEntryForm accounts={mockAccounts} onSubmit={vi.fn()} />);
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getAllByText('Description').length).toBeGreaterThan(0);
    });

    it('renders debit and credit line headers', async () => {
      const { JournalEntryForm } = await import('../journal-entry-form');
      render(<JournalEntryForm accounts={mockAccounts} onSubmit={vi.fn()} />);
      expect(screen.getAllByText(/Debit/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Credit/).length).toBeGreaterThan(0);
    });

    it('renders add line button', async () => {
      const { JournalEntryForm } = await import('../journal-entry-form');
      render(<JournalEntryForm accounts={mockAccounts} onSubmit={vi.fn()} />);
      expect(screen.getByText('Add Line')).toBeInTheDocument();
    });
  });

  describe('InvoiceForm', () => {
    it('renders invoice form with type-specific fields', async () => {
      const { InvoiceForm } = await import('../invoice-form');
      render(
        <InvoiceForm
          invoiceType="SALES"
          customers={[{ id: 'c1', firstName: 'Priya', lastName: 'Sharma' }]}
          locations={[{ id: 'l1', name: 'Main Store' }]}
          onSubmit={vi.fn()}
        />,
      );
      expect(screen.getByText(/Invoice/i)).toBeInTheDocument();
    });

    it('renders add line item button', async () => {
      const { InvoiceForm } = await import('../invoice-form');
      render(
        <InvoiceForm
          invoiceType="SALES"
          locations={[{ id: 'l1', name: 'Main Store' }]}
          onSubmit={vi.fn()}
        />,
      );
      expect(screen.getByText('Add Line Item')).toBeInTheDocument();
    });
  });

  describe('PaymentForm', () => {
    it('renders payment form with method selection', async () => {
      const { PaymentForm } = await import('../payment-form');
      render(<PaymentForm paymentType="RECEIVED" onSubmit={vi.fn()} />);
      expect(screen.getByText('Payment Method')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });
  });

  describe('TaxBreakdownDisplay', () => {
    it('shows GST split for intra-state transaction', async () => {
      const { TaxBreakdownDisplay } = await import('../tax-breakdown-display');
      render(
        <TaxBreakdownDisplay
          taxableAmountPaise={10000000}
          cgstPaise={150000}
          sgstPaise={150000}
          igstPaise={0}
          isInterState={false}
        />,
      );
      expect(screen.getAllByText(/CGST/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/SGST/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Intra-state supply/)).toBeInTheDocument();
    });

    it('shows IGST for inter-state transaction', async () => {
      const { TaxBreakdownDisplay } = await import('../tax-breakdown-display');
      render(
        <TaxBreakdownDisplay
          taxableAmountPaise={10000000}
          cgstPaise={0}
          sgstPaise={0}
          igstPaise={300000}
          isInterState={true}
        />,
      );
      expect(screen.getAllByText(/IGST/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Inter-state supply/)).toBeInTheDocument();
    });
  });

  describe('ReconciliationTable', () => {
    it('renders bank transactions table', async () => {
      const { ReconciliationTable } = await import('../reconciliation-table');
      const transactions = [
        { id: 't1', transactionDate: '2026-04-01', description: 'Payment received', debitPaise: 500000, creditPaise: 0, runningBalancePaise: 1500000, isReconciled: false },
      ];
      render(<ReconciliationTable transactions={transactions} />);
      expect(screen.getByText('Payment received')).toBeInTheDocument();
    });

    it('renders empty state when no transactions', async () => {
      const { ReconciliationTable } = await import('../reconciliation-table');
      render(<ReconciliationTable transactions={[]} />);
      expect(screen.getByText(/no.*transactions/i)).toBeInTheDocument();
    });
  });

  describe('FinancialStatementTable', () => {
    it('renders financial statement with sections', async () => {
      const { FinancialStatementTable } = await import('../financial-statement-table');
      render(
        <FinancialStatementTable
          title="Profit & Loss"
          sections={[
            { name: 'Revenue', rows: [{ accountName: 'Sales', amount: 1000000 }], total: 1000000 },
            { name: 'Expenses', rows: [{ accountName: 'Cost of Goods', amount: 600000 }], total: 600000 },
          ]}
          grandTotal={{ label: 'Net Profit', amount: 400000 }}
        />,
      );
      expect(screen.getByText('Profit & Loss')).toBeInTheDocument();
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText('Net Profit')).toBeInTheDocument();
    });
  });
});
