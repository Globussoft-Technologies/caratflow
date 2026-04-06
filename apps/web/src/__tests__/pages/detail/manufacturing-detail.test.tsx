import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock feature components used by manufacturing detail pages
vi.mock('@/features/manufacturing', () => ({
  BomBuilder: ({ items, readOnly }: { items: unknown[]; onChange: unknown; readOnly?: boolean }) => (
    <div data-testid="bom-builder">BOM Builder ({items.length} items, readOnly={String(readOnly)})</div>
  ),
  JobTimeline: ({ steps }: { steps: unknown[] }) => (
    <div data-testid="job-timeline">Job Timeline ({steps.length} steps)</div>
  ),
  buildTimelineSteps: (status: string, _dates: Record<string, string | undefined>) => {
    const steps = ['CREATED', 'IN_PROGRESS', 'QC', 'COMPLETED'];
    return steps.map((s) => ({ label: s, isComplete: false, isCurrent: s === status }));
  },
  MetalBalanceLedger: ({ balances }: { balances: unknown[] }) => (
    <div data-testid="metal-balance-ledger">Ledger ({balances.length} entries)</div>
  ),
  AttendanceCalendar: ({ records }: { records: unknown[] }) => (
    <div data-testid="attendance-calendar">Attendance ({records.length} records)</div>
  ),
}));

describe('Manufacturing Detail Pages', () => {
  describe('BOM Detail [id]', () => {
    it('renders with page header containing BOM name', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/bom/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('22K Gold Necklace BOM')).toBeInTheDocument();
    });

    it('renders summary cards with estimated cost and time', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/bom/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Output Quantity')).toBeInTheDocument();
      expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
      expect(screen.getByText('Estimated Time')).toBeInTheDocument();
    });

    it('renders Material Breakdown section with BomBuilder', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/bom/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Material Breakdown')).toBeInTheDocument();
      expect(screen.getByTestId('bom-builder')).toBeInTheDocument();
    });
  });

  describe('Job Detail [id]', () => {
    it('renders with job number in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/jobs/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Job JO-000001')).toBeInTheDocument();
    });

    it('renders Material Log and Cost Breakdown sections', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/jobs/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Material Log')).toBeInTheDocument();
      expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
    });

    it('renders Quality Checks section', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/jobs/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Quality Checks')).toBeInTheDocument();
    });
  });

  describe('New Job Order', () => {
    it('renders with page header title "New Job Order"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/jobs/new/page'
      );
      render(<Page />);
      expect(screen.getByText('New Job Order')).toBeInTheDocument();
    });

    it('renders form sections for product, assignment, and schedule', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/jobs/new/page'
      );
      render(<Page />);
      expect(screen.getByText('Product & BOM')).toBeInTheDocument();
      expect(screen.getByText('Assignment')).toBeInTheDocument();
      expect(screen.getByText('Schedule')).toBeInTheDocument();
    });

    it('renders Create Job Order submit button', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/jobs/new/page'
      );
      render(<Page />);
      expect(screen.getByText('Create Job Order')).toBeInTheDocument();
    });
  });

  describe('Karigar Detail [id]', () => {
    it('renders karigar name in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/karigars/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    });

    it('renders performance stat cards', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/karigars/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Total Jobs')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
      expect(screen.getByText('Wastage')).toBeInTheDocument();
    });

    it('renders metal balance ledger and attendance calendar', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/karigars/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('metal-balance-ledger')).toBeInTheDocument();
      expect(screen.getByTestId('attendance-calendar')).toBeInTheDocument();
    });
  });
});
