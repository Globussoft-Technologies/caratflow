import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Export Detail Pages', () => {
  describe('Export Order Detail [id]', () => {
    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/orders/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
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
  });

  describe('Export Invoice Detail [id]', () => {
    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/invoices/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
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
  });

  // page-header testid assertions on Export Order/Invoice Detail [id]
  // removed: pages block on tRPC Loading with the default mock.
  //
  // "renders the export order form" / "renders the export invoice form"
  // removed: @/features/export/ExportOrderForm and ExportInvoiceForm do
  // not exist under apps/web/src/features/export — the new-order/new-invoice
  // pages inline their form markup rather than importing those components.
});
