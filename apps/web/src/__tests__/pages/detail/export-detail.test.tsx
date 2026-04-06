import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock feature components used by export detail pages
vi.mock('@/features/export/ExportOrderForm', () => ({
  ExportOrderForm: () => <div data-testid="export-order-form">Export Order Form</div>,
}));

vi.mock('@/features/export/ExportInvoiceForm', () => ({
  ExportInvoiceForm: () => <div data-testid="export-invoice-form">Export Invoice Form</div>,
}));


describe('Export Detail Pages', () => {
  describe('Export Order Detail [id]', () => {
    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/orders/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/orders/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('New Export Order', () => {
    it('renders with page header title "New Export Order"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/orders/new/page'
      );
      render(<Page />);
      expect(screen.getByText('New Export Order')).toBeInTheDocument();
    });

    it('renders the export order form', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/orders/new/page'
      );
      render(<Page />);
      expect(screen.getByTestId('export-order-form')).toBeInTheDocument();
    });
  });

  describe('Export Invoice Detail [id]', () => {
    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/invoices/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/invoices/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('New Export Invoice', () => {
    it('renders with page header title "New Export Invoice"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/invoices/new/page'
      );
      render(<Page />);
      expect(screen.getByText('New Export Invoice')).toBeInTheDocument();
    });

    it('renders the export invoice form', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/invoices/new/page'
      );
      render(<Page />);
      expect(screen.getByTestId('export-invoice-form')).toBeInTheDocument();
    });
  });
});
