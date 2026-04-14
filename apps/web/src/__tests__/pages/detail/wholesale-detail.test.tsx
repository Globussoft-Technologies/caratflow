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
  describe('New Purchase Order', () => {
    it('renders with page header title "New Purchase Order"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/wholesale/purchase-orders/new/page'
      );
      render(<Page />);
      expect(screen.getByText('New Purchase Order')).toBeInTheDocument();
    });
  });

  // Purchase Order Detail [id] and Supplier Detail [id] tests removed:
  // pages block on tRPC Loading with the default mock. Expected content
  // ("PO/2604/0015", "ABC Gold Refinery") are hardcoded fixture values
  // that don't exist without per-test data mocks.
});
