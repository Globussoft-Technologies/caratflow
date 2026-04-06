import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Wholesale Pages', () => {
  describe('Wholesale Dashboard', () => {
    it('renders with page header title "Wholesale & Distribution"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/wholesale/page');
      render(<Page />);
      expect(screen.getByText('Wholesale & Distribution')).toBeInTheDocument();
    });

    it('renders stat cards for wholesale overview', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/wholesale/page');
      render(<Page />);
      expect(screen.getByText('Pending POs')).toBeInTheDocument();
      expect(screen.getByText('Active Consignments')).toBeInTheDocument();
    });
  });

  describe('Purchase Orders Page', () => {
    it('renders with page header title "Purchase Orders"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/wholesale/purchase-orders/page');
      render(<Page />);
      expect(screen.getByText('Purchase Orders')).toBeInTheDocument();
    });
  });

  describe('Consignments In Page', () => {
    it('renders with page header title "Incoming Consignments"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/wholesale/consignments-in/page');
      render(<Page />);
      expect(screen.getByText('Incoming Consignments')).toBeInTheDocument();
    });
  });

  describe('Consignments Out Page', () => {
    it('renders with page header title "Outgoing Consignments"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/wholesale/consignments-out/page');
      render(<Page />);
      expect(screen.getByText('Outgoing Consignments')).toBeInTheDocument();
    });
  });

  describe('Agents Page', () => {
    it('renders with page header title "Agents & Brokers"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/wholesale/agents/page');
      render(<Page />);
      expect(screen.getByText('Agents & Brokers')).toBeInTheDocument();
    });
  });

  describe('Credit & Outstanding Page', () => {
    it('renders with page header title "Credit & Outstanding"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/wholesale/credit/page');
      render(<Page />);
      expect(screen.getByText('Credit & Outstanding')).toBeInTheDocument();
    });
  });

  describe('Outstanding Page', () => {
    it('renders with page header title "Outstanding & Credit"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/wholesale/outstanding/page');
      render(<Page />);
      expect(screen.getByText('Outstanding & Credit')).toBeInTheDocument();
    });
  });
});
