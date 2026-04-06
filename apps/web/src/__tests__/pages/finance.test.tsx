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
      expect(screen.getByText('Revenue (MTD)')).toBeInTheDocument();
      expect(screen.getByText('Expenses (MTD)')).toBeInTheDocument();
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
    it('renders with page header title "Tax Management"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/tax/page');
      render(<Page />);
      expect(screen.getByText('Tax Management')).toBeInTheDocument();
    });
  });

  describe('Bank Page', () => {
    it('renders with page header title "Banking"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/bank/page');
      render(<Page />);
      expect(screen.getByText('Banking')).toBeInTheDocument();
    });
  });

  describe('BNPL Page', () => {
    it('renders with page header title "BNPL & EMI"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/bnpl/page');
      render(<Page />);
      expect(screen.getByText('BNPL & EMI')).toBeInTheDocument();
    });
  });

  describe('Girvi Page', () => {
    it('renders with page header title "Girvi / Mortgage Loans"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/girvi/page');
      render(<Page />);
      expect(screen.getByText('Girvi / Mortgage Loans')).toBeInTheDocument();
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
    it('renders with page header title "Schemes"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/finance/schemes/page');
      render(<Page />);
      expect(screen.getByText('Schemes')).toBeInTheDocument();
    });
  });
});
