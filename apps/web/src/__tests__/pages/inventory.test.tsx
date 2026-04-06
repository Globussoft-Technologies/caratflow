import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Inventory Pages', () => {
  describe('Inventory Dashboard', () => {
    it('renders with page header title "Inventory"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/page');
      render(<Page />);
      expect(screen.getByText('Inventory')).toBeInTheDocument();
    });

    it('renders stat cards for stock overview', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/page');
      render(<Page />);
      expect(screen.getByText('Total Stock Value')).toBeInTheDocument();
      expect(screen.getByText('Total SKUs')).toBeInTheDocument();
      expect(screen.getByText('Low Stock Alerts')).toBeInTheDocument();
      expect(screen.getByText('Pending Transfers')).toBeInTheDocument();
    });

    it('renders recent movements section with DataTable', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/page');
      render(<Page />);
      expect(screen.getByText('Recent Movements')).toBeInTheDocument();
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });
  });

  describe('Stock Items Page', () => {
    it('renders with page header title "Stock Items"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/items/page');
      render(<Page />);
      expect(screen.getByText('Stock Items')).toBeInTheDocument();
    });

    it('renders search input for SKU/name filtering', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/items/page');
      render(<Page />);
      expect(screen.getByPlaceholderText('Search by SKU or name...')).toBeInTheDocument();
    });

    it('renders low stock only checkbox filter', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/items/page');
      render(<Page />);
      expect(screen.getByText('Low Stock Only')).toBeInTheDocument();
    });

    it('renders the DataTable for stock items', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/items/page');
      render(<Page />);
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });
  });

  describe('Stock Movements Page', () => {
    it('renders with page header title "Stock Movements"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/movements/page');
      render(<Page />);
      expect(screen.getByText('Stock Movements')).toBeInTheDocument();
    });
  });

  describe('Stock Transfers Page', () => {
    it('renders with page header title "Stock Transfers"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/transfers/page');
      render(<Page />);
      expect(screen.getByText('Stock Transfers')).toBeInTheDocument();
    });
  });

  describe('Stock Takes Page', () => {
    it('renders with page header title "Stock Takes"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/stock-takes/page');
      render(<Page />);
      expect(screen.getByText('Stock Takes')).toBeInTheDocument();
    });
  });

  describe('Metal Stock Page', () => {
    it('renders with page header title "Metal Stock"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/metals/page');
      render(<Page />);
      expect(screen.getByText('Metal Stock')).toBeInTheDocument();
    });
  });

  describe('Stone Stock Page', () => {
    it('renders with page header title "Stone Stock"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/stones/page');
      render(<Page />);
      expect(screen.getByText('Stone Stock')).toBeInTheDocument();
    });
  });

  describe('Stock Valuation Page', () => {
    it('renders with page header title "Stock Valuation"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/inventory/valuation/page');
      render(<Page />);
      expect(screen.getByText('Stock Valuation')).toBeInTheDocument();
    });
  });
});
