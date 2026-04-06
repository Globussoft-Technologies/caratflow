import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Reports Pages', () => {
  describe('Reports Hub', () => {
    it('renders with page header title "Reports & Analytics"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/page');
      render(<Page />);
      expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
    });

    it('renders report category cards', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/page');
      render(<Page />);
      expect(screen.getByText('Sales Analytics')).toBeInTheDocument();
      expect(screen.getByText('Inventory Reports')).toBeInTheDocument();
    });
  });

  describe('Sales Reports Page', () => {
    it('renders with page header title "Sales Analytics"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/sales/page');
      render(<Page />);
      expect(screen.getByText('Sales Analytics')).toBeInTheDocument();
    });
  });

  describe('Inventory Reports Page', () => {
    it('renders with page header title "Inventory Analytics"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/inventory/page');
      render(<Page />);
      expect(screen.getByText('Inventory Analytics')).toBeInTheDocument();
    });
  });

  describe('Manufacturing Reports Page', () => {
    it('renders with page header title "Manufacturing Analytics"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/manufacturing/page');
      render(<Page />);
      expect(screen.getByText('Manufacturing Analytics')).toBeInTheDocument();
    });
  });

  describe('CRM Reports Page', () => {
    it('renders with page header title "Customer Analytics"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/crm/page');
      render(<Page />);
      expect(screen.getByText('Customer Analytics')).toBeInTheDocument();
    });
  });

  describe('Custom Reports Page', () => {
    it('renders with page header title "Custom Report Builder"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/custom/page');
      render(<Page />);
      expect(screen.getByText('Custom Report Builder')).toBeInTheDocument();
    });
  });

  describe('Forecast Page', () => {
    it('renders with page header title "Demand Forecasting"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/forecast/page');
      render(<Page />);
      expect(screen.getByText('Demand Forecasting')).toBeInTheDocument();
    });
  });

  describe('Scheduled Reports Page', () => {
    it('renders with page header title "Scheduled Reports"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/scheduled/page');
      render(<Page />);
      expect(screen.getByText('Scheduled Reports')).toBeInTheDocument();
    });
  });
});
