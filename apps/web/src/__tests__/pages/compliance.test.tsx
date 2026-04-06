import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Compliance Pages', () => {
  describe('Compliance Dashboard', () => {
    it('renders with page header title "Compliance"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/compliance/page');
      render(<Page />);
      expect(screen.getByText('Compliance')).toBeInTheDocument();
    });

    it('renders stat cards for compliance overview', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/compliance/page');
      render(<Page />);
      expect(screen.getAllByText('HUID Coverage').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Pending Hallmarks').length).toBeGreaterThan(0);
    });
  });

  describe('HUID Registry Page', () => {
    it('renders with page header title "HUID Registry"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/compliance/huid/page');
      render(<Page />);
      expect(screen.getByText('HUID Registry')).toBeInTheDocument();
    });
  });

  describe('Hallmark Submissions Page', () => {
    it('renders with page header title "Hallmark Submissions"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/compliance/hallmark/page');
      render(<Page />);
      expect(screen.getByText('Hallmark Submissions')).toBeInTheDocument();
    });
  });

  describe('Certificates Page', () => {
    it('renders with page header title "Gemstone Certificates"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/compliance/certificates/page');
      render(<Page />);
      expect(screen.getByText('Gemstone Certificates')).toBeInTheDocument();
    });
  });

  describe('Traceability Page', () => {
    it('renders with page header title "Traceability"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/compliance/traceability/page');
      render(<Page />);
      expect(screen.getByText('Traceability')).toBeInTheDocument();
    });
  });

  describe('Documents Page', () => {
    it('renders with page header title "Compliance Documents"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/compliance/documents/page');
      render(<Page />);
      expect(screen.getByText('Compliance Documents')).toBeInTheDocument();
    });
  });

  describe('Insurance Page', () => {
    it('renders with page header title "Insurance Policies"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/compliance/insurance/page');
      render(<Page />);
      expect(screen.getByText('Insurance Policies')).toBeInTheDocument();
    });
  });

  describe('Audits Page', () => {
    it('renders with page header title "Compliance Audits"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/compliance/audits/page');
      render(<Page />);
      expect(screen.getByText('Compliance Audits')).toBeInTheDocument();
    });
  });

  describe('AML Page', () => {
    it('renders with page header title "AML Compliance"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/compliance/aml/page');
      render(<Page />);
      expect(screen.getByText('AML Compliance')).toBeInTheDocument();
    });
  });
});
