import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock feature components used by wholesale detail pages
vi.mock('@/features/wholesale', () => ({
  SupplierPerformanceCard: (props: Record<string, unknown>) => (
    <div data-testid="supplier-performance-card">Supplier Performance ({String(props.supplierName)})</div>
  ),
}));

vi.mock('@/features/wholesale/PurchaseOrderForm', () => ({
  PurchaseOrderForm: () => <div data-testid="purchase-order-form">PO Form</div>,
}));

describe('Wholesale Detail Pages', () => {
  describe('Purchase Order Detail [id]', () => {
    it('renders with PO number in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/wholesale/purchase-orders/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('PO/2604/0015')).toBeInTheDocument();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/wholesale/purchase-orders/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('New Purchase Order', () => {
    it('renders with page header title "New Purchase Order"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/wholesale/purchase-orders/new/page'
      );
      render(<Page />);
      expect(screen.getByText('New Purchase Order')).toBeInTheDocument();
    });
  });

  describe('Supplier Detail [id]', () => {
    it('renders with supplier name in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/wholesale/suppliers/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('ABC Gold Refinery')).toBeInTheDocument();
    });

    it('renders supplier performance card', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/wholesale/suppliers/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('supplier-performance-card')).toBeInTheDocument();
    });
  });
});
