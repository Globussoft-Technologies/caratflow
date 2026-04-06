import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock feature components used by reports detail pages
vi.mock('@/features/reporting', () => ({
  ReportTable: ({ columns, data }: { columns: unknown[]; data: unknown[] }) => (
    <div data-testid="report-table">Report Table ({columns?.length ?? 0} cols, {data?.length ?? 0} rows)</div>
  ),
  ExportButton: ({ onExport }: { onExport: (format: string) => void }) => (
    <button data-testid="export-button" onClick={() => onExport('csv')}>Export</button>
  ),
}));

describe('Reports Detail Pages', () => {
  describe('Custom Report [id]', () => {
    it('renders with page header title "Saved Report"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/reports/custom/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Saved Report')).toBeInTheDocument();
    });

    it('renders without crashing and shows page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/reports/custom/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });
});
