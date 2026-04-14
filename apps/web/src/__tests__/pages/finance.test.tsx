import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Finance Pages', () => {
  describe('Finance Dashboard', () => {
    it('renders with page header title "Finance"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/page');
      render(<Page />);
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    it('renders stat cards for financial overview', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/page');
      render(<Page />);
      // actual StatCard titles on the current dashboard
      expect(screen.getByText('Receivables')).toBeInTheDocument();
      expect(screen.getByText('Payables')).toBeInTheDocument();
      expect(screen.getByText('Cash Balance')).toBeInTheDocument();
      expect(screen.getByText('MTD Revenue')).toBeInTheDocument();
    });
  });

  describe('Journal Page', () => {
    it('renders with page header title "Journal Entries"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/journal/page');
      render(<Page />);
      expect(screen.getByText('Journal Entries')).toBeInTheDocument();
    });
  });

  describe('Invoices Page', () => {
    it('renders with page header title "Invoices"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/invoices/page');
      render(<Page />);
      expect(screen.getByText('Invoices')).toBeInTheDocument();
    });
  });

  describe('Payments Page', () => {
    it('renders with page header title "Payments"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/payments/page');
      render(<Page />);
      expect(screen.getByText('Payments')).toBeInTheDocument();
    });
  });

  describe('Tax Page', () => {
    it('renders with page header title "Tax"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/tax/page');
      render(<Page />);
      // title is "Tax" (was "Tax Management" earlier)
      expect(screen.getByText('Tax')).toBeInTheDocument();
    });
  });

  describe('Bank Page', () => {
    it('renders with page header title "Bank Accounts"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/bank/page');
      render(<Page />);
      // title is "Bank Accounts" (was "Banking" earlier)
      expect(screen.getByText('Bank Accounts')).toBeInTheDocument();
    });
  });

  describe('BNPL Page', () => {
    it('renders with page header title "Buy Now Pay Later"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/bnpl/page');
      render(<Page />);
      // title is "Buy Now Pay Later" (was "BNPL & EMI" earlier)
      expect(screen.getByText('Buy Now Pay Later')).toBeInTheDocument();
    });
  });

  describe('Girvi Page', () => {
    it('renders with page header title "Girvi (Gold Loans)"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/girvi/page');
      render(<Page />);
      // title is "Girvi (Gold Loans)" (was "Girvi / Mortgage Loans" earlier)
      expect(screen.getByText('Girvi (Gold Loans)')).toBeInTheDocument();
    });
  });

  describe('Rates Page', () => {
    it('renders with page header title "Metal Rates"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/rates/page');
      render(<Page />);
      expect(screen.getByText('Metal Rates')).toBeInTheDocument();
    });
  });

  describe('Financial Reports Page', () => {
    it('renders with page header title "Financial Reports"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/reports/page');
      render(<Page />);
      expect(screen.getByText('Financial Reports')).toBeInTheDocument();
    });
  });

  describe('Schemes Page', () => {
    it('renders with page header title "Savings Schemes"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/schemes/page');
      render(<Page />);
      // title is "Savings Schemes" (was "Schemes" earlier)
      expect(screen.getByText('Savings Schemes')).toBeInTheDocument();
    });
  });
});
