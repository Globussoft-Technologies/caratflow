import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Retail Pages', () => {
  describe('Retail Dashboard', () => {
    it('renders with page header title "Retail & POS"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/retail/page');
      render(<Page />);
      expect(screen.getByText('Retail & POS')).toBeInTheDocument();
    });

    it('renders stat cards for daily sales overview', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/retail/page');
      render(<Page />);
      expect(screen.getByText("Today's Sales")).toBeInTheDocument();
      expect(screen.getByText("Today's Revenue")).toBeInTheDocument();
    });
  });

  describe('POS Page', () => {
    it('renders with POS heading', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/retail/pos/page');
      render(<Page />);
      expect(screen.getByText('POS')).toBeInTheDocument();
    });
  });

  describe('Sales Page', () => {
    it('renders with page header title "Sales History"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/retail/sales/page');
      render(<Page />);
      expect(screen.getByText('Sales History')).toBeInTheDocument();
    });
  });

  describe('Returns Page', () => {
    it('renders with page header title "Sale Returns"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/retail/returns/page');
      render(<Page />);
      expect(screen.getByText('Sale Returns')).toBeInTheDocument();
    });
  });

  describe('Repairs Page', () => {
    it('renders with page header title "Repair Queue"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/retail/repairs/page');
      render(<Page />);
      expect(screen.getByText('Repair Queue')).toBeInTheDocument();
    });
  });

  describe('Custom Orders Page', () => {
    it('renders with page header title "Custom Orders"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/retail/custom-orders/page');
      render(<Page />);
      expect(screen.getByText('Custom Orders')).toBeInTheDocument();
    });
  });
});
