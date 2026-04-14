import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('E-Commerce Pages', () => {
  describe('E-Commerce Dashboard', () => {
    it('renders with page header title "E-Commerce"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/page');
      render(<Page />);
      // actual title is "E-Commerce" (was "E-Commerce & Omnichannel" earlier)
      expect(screen.getAllByText('E-Commerce').length).toBeGreaterThan(0);
    });

    it('renders stat cards for online sales overview', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/page');
      render(<Page />);
      // actual StatCard titles on the current dashboard
      expect(screen.getByText('MTD Orders')).toBeInTheDocument();
      expect(screen.getByText('MTD Revenue')).toBeInTheDocument();
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
    it('renders with page header title "Catalog"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/catalog/page');
      render(<Page />);
      // title is "Catalog" (was "Product Catalog" earlier)
      expect(screen.getByText('Catalog')).toBeInTheDocument();
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
    it('renders with page header title "Pre-Orders"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/preorders/page');
      render(<Page />);
      // title is "Pre-Orders" (was "Pre-Orders & Backorders" earlier)
      expect(screen.getByText('Pre-Orders')).toBeInTheDocument();
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
    it('renders with page header title "AR Try-On Catalog"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/ecommerce/ar/page');
      render(<Page />);
      // title is "AR Try-On Catalog" (was "AR & Virtual Try-On" earlier)
      expect(screen.getByText('AR Try-On Catalog')).toBeInTheDocument();
    });
  });
});
