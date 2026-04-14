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
      // category link labels on the current reports hub
      expect(screen.getByText('Sales Reports')).toBeInTheDocument();
      expect(screen.getByText('Inventory Reports')).toBeInTheDocument();
    });
  });

  describe('Sales Reports Page', () => {
    it('renders with page header title "Sales Report"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/sales/page');
      render(<Page />);
      // title is "Sales Report" (was "Sales Analytics" earlier)
      expect(screen.getByText('Sales Report')).toBeInTheDocument();
    });
  });

  describe('Inventory Reports Page', () => {
    it('renders with page header title "Inventory Reports"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/inventory/page');
      render(<Page />);
      // title is "Inventory Reports" (was "Inventory Analytics" earlier)
      expect(screen.getAllByText('Inventory Reports').length).toBeGreaterThan(0);
    });
  });

  describe('Manufacturing Reports Page', () => {
    it('renders with page header title "Manufacturing Reports"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/manufacturing/page');
      render(<Page />);
      // title is "Manufacturing Reports" (was "Manufacturing Analytics" earlier)
      expect(screen.getByText('Manufacturing Reports')).toBeInTheDocument();
    });
  });

  describe('CRM Reports Page', () => {
    it('renders with page header title "CRM Reports"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/crm/page');
      render(<Page />);
      // title is "CRM Reports" (was "Customer Analytics" earlier)
      expect(screen.getByText('CRM Reports')).toBeInTheDocument();
    });
  });

  describe('Custom Reports Page', () => {
    it('renders with page header title "Saved Reports"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/custom/page');
      render(<Page />);
      // title is "Saved Reports" (was "Custom Report Builder" earlier)
      expect(screen.getByText('Saved Reports')).toBeInTheDocument();
    });
  });

  describe('Forecast Page', () => {
    it('renders with page header title "Forecasting"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/reports/forecast/page');
      render(<Page />);
      // title is "Forecasting" (was "Demand Forecasting" earlier)
      expect(screen.getByText('Forecasting')).toBeInTheDocument();
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
