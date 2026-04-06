import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock feature components used by ecommerce detail pages
vi.mock('@/features/ecommerce', () => ({
  OrderTimeline: ({ events }: { events?: unknown[] }) => (
    <div data-testid="order-timeline">Order Timeline ({events?.length ?? 0} events)</div>
  ),
  ChannelBadge: ({ channel }: { channel: string }) => (
    <span data-testid="channel-badge">{channel}</span>
  ),
  PaymentStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="payment-status-badge">{status}</span>
  ),
  ShipmentTracker: (props: Record<string, unknown>) => (
    <div data-testid="shipment-tracker">Shipment Tracker</div>
  ),
  SyncStatusIndicator: ({ status }: { status: string }) => (
    <span data-testid="sync-status">{status}</span>
  ),
}));

describe('E-Commerce Detail Pages', () => {
  describe('Order Detail [id]', () => {
    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/ecommerce/orders/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/ecommerce/orders/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('Channel Detail [id]', () => {
    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/ecommerce/channels/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/ecommerce/channels/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('Pre-Order Detail [id]', () => {
    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/ecommerce/preorders/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/ecommerce/preorders/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('AR Config [productId]', () => {
    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/ecommerce/ar/[productId]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/ecommerce/ar/[productId]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });
});
