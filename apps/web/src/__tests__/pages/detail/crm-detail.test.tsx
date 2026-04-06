import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('CRM Detail Pages', () => {
  describe('Customer Detail [id]', () => {
    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/crm/customers/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/crm/customers/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('Lead Detail [id]', () => {
    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/crm/leads/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/crm/leads/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('Campaign Detail [id]', () => {
    it('renders with campaign name in page header', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/crm/campaigns/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Diwali Gold Offer')).toBeInTheDocument();
    });

    it('renders campaign stat cards', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/crm/campaigns/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Total Recipients')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });
  });
});
