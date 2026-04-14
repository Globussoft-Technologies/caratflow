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
    it('renders with page header title "Sales"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/retail/sales/page');
      render(<Page />);
      // title is "Sales" (was "Sales History" earlier)
      expect(screen.getAllByText('Sales').length).toBeGreaterThan(0);
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
    it('renders with page header title "Repair Orders"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/retail/repairs/page');
      render(<Page />);
      // title is "Repair Orders" (was "Repair Queue" earlier)
      expect(screen.getByText('Repair Orders')).toBeInTheDocument();
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
