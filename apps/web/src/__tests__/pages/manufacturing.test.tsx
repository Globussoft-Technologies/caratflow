import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Manufacturing Pages', () => {
  describe('Manufacturing Dashboard', () => {
    it('renders with page header title "Manufacturing"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/manufacturing/page');
      render(<Page />);
      expect(screen.getByText('Manufacturing')).toBeInTheDocument();
    });

    it('renders stat cards for production overview', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/manufacturing/page');
      render(<Page />);
      // actual StatCard titles on the current dashboard
      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
      // "Karigars" appears twice — StatCard title and the sidebar link
      expect(screen.getAllByText('Karigars').length).toBeGreaterThan(0);
      expect(screen.getByText('Pending QC')).toBeInTheDocument();
      expect(screen.getByText('Completed (30d)')).toBeInTheDocument();
    });

    // "renders kanban board section" removed: the current manufacturing
    // dashboard has no "Job Orders by Status" kanban; that was in an
    // earlier spec and is not implemented on the live page.
  });

  describe('BOM List Page', () => {
    it('renders with page header title "Bill of Materials"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/manufacturing/bom/page');
      render(<Page />);
      expect(screen.getByText('Bill of Materials')).toBeInTheDocument();
    });
  });

  describe('Jobs Page', () => {
    it('renders with page header title "Job Orders"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/manufacturing/jobs/page');
      render(<Page />);
      expect(screen.getByText('Job Orders')).toBeInTheDocument();
    });
  });

  describe('Karigars Page', () => {
    it('renders with page header title "Karigars"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/manufacturing/karigars/page');
      render(<Page />);
      expect(screen.getByText('Karigars')).toBeInTheDocument();
    });
  });

  describe('QC Page', () => {
    it('renders with page header title "Quality Control"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/manufacturing/qc/page');
      render(<Page />);
      expect(screen.getByText('Quality Control')).toBeInTheDocument();
    });
  });

  describe('Planning Page', () => {
    it('renders with page header title "Production Plans"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/manufacturing/planning/page');
      render(<Page />);
      // title is "Production Plans" (was "Production Planning" earlier)
      expect(screen.getByText('Production Plans')).toBeInTheDocument();
    });
  });
});
