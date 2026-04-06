import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('E-Commerce Pages', () => {
  describe('E-Commerce Dashboard', () => {
    it('renders with page header title "E-Commerce & Omnichannel"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/page');
      render(<Page />);
      expect(screen.getByText('E-Commerce & Omnichannel')).toBeInTheDocument();
    });

    it('renders stat cards for online sales overview', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/page');
      render(<Page />);
      expect(screen.getByText('Online Orders Today')).toBeInTheDocument();
      expect(screen.getByText('Online Revenue (Month)')).toBeInTheDocument();
    });
  });

  describe('Channels Page', () => {
    it('renders with page header title "Sales Channels"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/channels/page');
      render(<Page />);
      expect(screen.getByText('Sales Channels')).toBeInTheDocument();
    });
  });

  describe('Catalog Page', () => {
    it('renders with page header title "Product Catalog"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/catalog/page');
      render(<Page />);
      expect(screen.getByText('Product Catalog')).toBeInTheDocument();
    });
  });

  describe('Orders Page', () => {
    it('renders with page header title "Online Orders"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/orders/page');
      render(<Page />);
      expect(screen.getByText('Online Orders')).toBeInTheDocument();
    });
  });

  describe('Shipments Page', () => {
    it('renders with page header title "Shipments"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/shipments/page');
      render(<Page />);
      expect(screen.getByText('Shipments')).toBeInTheDocument();
    });
  });

  describe('Payments Page', () => {
    it('renders with page header title "Online Payments"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/payments/page');
      render(<Page />);
      expect(screen.getByText('Online Payments')).toBeInTheDocument();
    });
  });

  describe('Preorders Page', () => {
    it('renders with page header title "Pre-Orders & Backorders"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/preorders/page');
      render(<Page />);
      expect(screen.getByText('Pre-Orders & Backorders')).toBeInTheDocument();
    });
  });

  describe('Search Analytics Page', () => {
    it('renders with page header title "Search Analytics"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/search/page');
      render(<Page />);
      expect(screen.getByText('Search Analytics')).toBeInTheDocument();
    });
  });

  describe('AR Page', () => {
    it('renders with page header title "AR & Virtual Try-On"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/ar/page');
      render(<Page />);
      expect(screen.getByText('AR & Virtual Try-On')).toBeInTheDocument();
    });
  });
});
