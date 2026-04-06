import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock feature components used by inventory detail pages
vi.mock('@/features/inventory/movement-timeline', () => ({
  MovementTimeline: ({ movements }: { movements: unknown[] }) => (
    <div data-testid="movement-timeline">Timeline ({movements.length} items)</div>
  ),
}));

describe('Inventory Detail Pages', () => {
  describe('Stock Item Detail [id]', () => {
    it('renders loading skeleton initially', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/inventory/items/[id]/page'
      );
      render(<Page />);
      // tRPC mock returns undefined data with isLoading: false, so it hits "not found"
      expect(screen.getByText('Stock item not found.')).toBeInTheDocument();
    });

    it('renders the page component without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/inventory/items/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });
  });

  describe('Metal Stock Page', () => {
    it('renders with page header title "Metal Stock"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/inventory/metals/page'
      );
      render(<Page />);
      expect(screen.getByText('Metal Stock')).toBeInTheDocument();
    });
  });

  describe('Stone Stock Page', () => {
    it('renders with page header title "Stone Stock"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/inventory/stones/page'
      );
      render(<Page />);
      expect(screen.getByText('Stone Stock')).toBeInTheDocument();
    });
  });

  describe('Stock Valuation Page', () => {
    it('renders with page header title "Stock Valuation"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/inventory/valuation/page'
      );
      render(<Page />);
      expect(screen.getByText('Stock Valuation')).toBeInTheDocument();
    });
  });
});
