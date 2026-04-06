import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock feature components used by finance detail pages
vi.mock('@/features/finance/tax-breakdown-display', () => ({
  TaxBreakdownDisplay: (props: Record<string, unknown>) => (
    <div data-testid="tax-breakdown">Tax Breakdown (taxable: {String(props.taxableAmountPaise)})</div>
  ),
}));

vi.mock('@/features/finance/invoice-form', () => ({
  InvoiceForm: (props: Record<string, unknown>) => (
    <div data-testid="invoice-form">Invoice Form (type: {String(props.invoiceType)})</div>
  ),
}));

describe('Finance Detail Pages', () => {
  describe('Invoice Detail [id]', () => {
    it('renders with invoice number in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/invoices/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Invoice INV-202604-0012')).toBeInTheDocument();
    });

    it('renders Line Items section with item descriptions', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/invoices/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Line Items')).toBeInTheDocument();
      expect(screen.getByText('22K Gold Necklace - 25g')).toBeInTheDocument();
      expect(screen.getByText('Making Charges')).toBeInTheDocument();
    });

    it('renders Payment History section', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/invoices/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Payment History')).toBeInTheDocument();
    });

    it('renders tax breakdown component', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/invoices/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('tax-breakdown')).toBeInTheDocument();
    });
  });

  describe('New Invoice', () => {
    it('renders with page header title "New Invoice"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/invoices/new/page'
      );
      render(<Page />);
      expect(screen.getByText('New Invoice')).toBeInTheDocument();
    });

    it('renders Sales and Purchase invoice type toggles', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/invoices/new/page'
      );
      render(<Page />);
      expect(screen.getByText('Sales Invoice')).toBeInTheDocument();
      expect(screen.getByText('Purchase Invoice')).toBeInTheDocument();
    });

    it('renders the invoice form component', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/invoices/new/page'
      );
      render(<Page />);
      expect(screen.getByTestId('invoice-form')).toBeInTheDocument();
    });
  });

  describe('Girvi Loan Detail [id]', () => {
    it('renders with loan number in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/girvi/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Loan GRV-202604-0012')).toBeInTheDocument();
    });

    it('renders Loan Details and Financial Summary sections', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/girvi/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Loan Details')).toBeInTheDocument();
      expect(screen.getByText('Financial Summary')).toBeInTheDocument();
    });

    it('renders Collateral Information with weight details', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/girvi/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Collateral Information')).toBeInTheDocument();
      expect(screen.getByText('48.5g')).toBeInTheDocument();
    });

    it('renders Payment History and Interest Accrual Log', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/girvi/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Payment History')).toBeInTheDocument();
      expect(screen.getByText('Interest Accrual Log')).toBeInTheDocument();
    });
  });

  describe('New Girvi Loan', () => {
    it('renders with page header title "New Girvi Loan"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/girvi/new/page'
      );
      render(<Page />);
      expect(screen.getByText('New Girvi Loan')).toBeInTheDocument();
    });

    it('renders Customer & KYC and Collateral Details sections', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/girvi/new/page'
      );
      render(<Page />);
      expect(screen.getByText('Customer & KYC')).toBeInTheDocument();
      expect(screen.getByText('Collateral Details')).toBeInTheDocument();
    });

    it('renders Valuation Summary section', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/girvi/new/page'
      );
      render(<Page />);
      expect(screen.getByText('Valuation Summary')).toBeInTheDocument();
    });
  });

  describe('Kitty Scheme Detail [id]', () => {
    it('renders with scheme name in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/schemes/kitty/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Diwali Gold Kitty 2026')).toBeInTheDocument();
    });
  });

  describe('Gold Savings Scheme Detail [id]', () => {
    it('renders with scheme name in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/schemes/gold-savings/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Gold Plus Monthly Plan')).toBeInTheDocument();
    });
  });
});
