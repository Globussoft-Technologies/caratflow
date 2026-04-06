import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock the SaleInvoice feature component (imported via relative path)
vi.mock('@/features/retail/SaleInvoice', () => ({
  SaleInvoice: (props: Record<string, unknown>) => (
    <div data-testid="sale-invoice">Sale Invoice (total: {String(props.totalPaise)})</div>
  ),
}));


describe('Retail Detail Pages', () => {
  describe('Sale Detail [id]', () => {
    it('renders with sale number in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/sales/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Sale SL/MUM/2604/0012')).toBeInTheDocument();
    });

    it('renders customer, location, and salesperson cards', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/sales/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByText('Mumbai Showroom')).toBeInTheDocument();
      expect(screen.getByText('Raj Kumar')).toBeInTheDocument();
    });

    it('renders Invoice Preview section', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/sales/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Invoice Preview')).toBeInTheDocument();
    });
  });

  describe('Repair Detail [id]', () => {
    it('renders with repair number in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/repairs/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Repair RP/MUM/2604/0002')).toBeInTheDocument();
    });

    it('renders customer and item info cards', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/repairs/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Meera Patel')).toBeInTheDocument();
      expect(screen.getByText('Platinum Ring - polishing + stone setting')).toBeInTheDocument();
    });

    it('renders diagnostic notes and cost breakdown', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/repairs/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Diagnostic Notes')).toBeInTheDocument();
      expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
    });

    it('renders timeline with status entries', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/repairs/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Item received from customer')).toBeInTheDocument();
      expect(screen.getByText('Work started by karigar Raju')).toBeInTheDocument();
    });
  });

  describe('Return Detail [id]', () => {
    it('renders with return number in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/returns/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Return RT/MUM/2604/0002')).toBeInTheDocument();
    });

    it('renders original sale reference and customer info', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/returns/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('SL/MUM/2604/0009')).toBeInTheDocument();
      expect(screen.getByText('Anita Desai')).toBeInTheDocument();
    });

    it('renders return items table with item details', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/returns/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Return Items')).toBeInTheDocument();
      expect(screen.getByText('22K Gold Ring - Classic')).toBeInTheDocument();
    });

    it('renders refund amount and metal rate difference', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/retail/returns/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Refund Amount')).toBeInTheDocument();
      expect(screen.getByText('Metal Rate Difference')).toBeInTheDocument();
    });
  });
});
