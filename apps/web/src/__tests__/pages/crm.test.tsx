import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('CRM Pages', () => {
  describe('CRM Dashboard', () => {
    it('renders with page header title "CRM"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/page');
      render(<Page />);
      expect(screen.getByText('CRM')).toBeInTheDocument();
    });

    it('renders stat cards for CRM metrics', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/page');
      render(<Page />);
      expect(screen.getByText('New Leads')).toBeInTheDocument();
      expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
      expect(screen.getByText('Active Customers')).toBeInTheDocument();
      expect(screen.getByText('Loyalty Members')).toBeInTheDocument();
    });
  });

  describe('Customers Page', () => {
    it('renders with page header title "Customers"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/customers/page');
      render(<Page />);
      expect(screen.getByText('Customers')).toBeInTheDocument();
    });
  });

  describe('Loyalty Page', () => {
    it('renders with page header title "Loyalty Program"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/loyalty/page');
      render(<Page />);
      expect(screen.getByText('Loyalty Program')).toBeInTheDocument();
    });
  });

  describe('Leads Page', () => {
    it('renders with page header title "Lead Pipeline"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/leads/page');
      render(<Page />);
      expect(screen.getByText('Lead Pipeline')).toBeInTheDocument();
    });
  });

  describe('Campaigns Page', () => {
    it('renders with page header title "Campaigns"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/campaigns/page');
      render(<Page />);
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
    });
  });

  describe('Notifications Page', () => {
    it('renders with page header title "Notifications"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/notifications/page');
      render(<Page />);
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  describe('Feedback Page', () => {
    it('renders with page header title "Customer Feedback"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/feedback/page');
      render(<Page />);
      expect(screen.getByText('Customer Feedback')).toBeInTheDocument();
    });
  });

  describe('Referrals Page', () => {
    it('renders with page header title "Referral Program"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/referrals/page');
      render(<Page />);
      expect(screen.getByText('Referral Program')).toBeInTheDocument();
    });
  });
});
