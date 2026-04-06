import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock feature components used by compliance detail pages
vi.mock('@/features/compliance', () => ({
  HuidBadge: ({ huid }: { huid: string }) => (
    <span data-testid="huid-badge">{huid}</span>
  ),
  HallmarkStatusTracker: ({ status }: { status: string }) => (
    <div data-testid="hallmark-status-tracker">Status: {status}</div>
  ),
  TraceabilityTimeline: ({ chain }: { chain: unknown[] }) => (
    <div data-testid="traceability-timeline">Traceability ({chain?.length ?? 0} events)</div>
  ),
}));

describe('Compliance Detail Pages', () => {
  describe('HUID Detail [id]', () => {
    it('renders HUID Detail page header when loading', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/compliance/huid/[id]/page'
      );
      render(<Page />);
      // tRPC mock returns undefined data with isLoading: false -> shows "not found"
      expect(screen.getByText('HUID Not Found')).toBeInTheDocument();
    });

    it('renders not found message for missing records', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/compliance/huid/[id]/page'
      );
      render(<Page />);
      expect(
        screen.getByText('The requested HUID record could not be found.')
      ).toBeInTheDocument();
    });
  });

  describe('Hallmark Submission Detail [id]', () => {
    it('renders Submission Detail or Not Found page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/compliance/hallmark/[id]/page'
      );
      render(<Page />);
      // tRPC mock returns undefined -> shows not-found variant
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('New Hallmark Submission', () => {
    it('renders with page header title "New Hallmark Submission"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/compliance/hallmark/new/page'
      );
      render(<Page />);
      expect(screen.getByText('New Hallmark Submission')).toBeInTheDocument();
    });

    it('renders the submission form without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/compliance/hallmark/new/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });
  });

  describe('Certificate Detail [id]', () => {
    it('renders Certificate page header when data is not found', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/compliance/certificates/[id]/page'
      );
      render(<Page />);
      // tRPC mock returns undefined data -> shows not found
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('Traceability [productId]', () => {
    it('renders Traceability Chain page header when data is not found', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/compliance/traceability/[productId]/page'
      );
      render(<Page />);
      // tRPC mock returns undefined data -> shows not found
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });
});
