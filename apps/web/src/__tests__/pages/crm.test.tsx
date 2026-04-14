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
      // actual StatCard titles on the current dashboard
      expect(screen.getByText('Total Customers')).toBeInTheDocument();
      expect(screen.getByText('Active Leads')).toBeInTheDocument();
      expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
      expect(screen.getByText('New (30d)')).toBeInTheDocument();
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
    it('renders with page header title "Loyalty Programs"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/loyalty/page');
      render(<Page />);
      // page title is "Loyalty Programs" (was "Loyalty Program" in an earlier spec)
      expect(screen.getByText('Loyalty Programs')).toBeInTheDocument();
    });
  });

  describe('Leads Page', () => {
    it('renders with page header title "Leads"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/leads/page');
      render(<Page />);
      // page title is "Leads" (was "Lead Pipeline" in an earlier spec)
      expect(screen.getByText('Leads')).toBeInTheDocument();
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
    it('renders with page header title "Notification Logs"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/notifications/page');
      render(<Page />);
      // page title is "Notification Logs" (was "Notifications" in an earlier spec)
      expect(screen.getByText('Notification Logs')).toBeInTheDocument();
    });
  });

  describe('Feedback Page', () => {
    it('renders with page header title "Feedback"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/crm/feedback/page');
      render(<Page />);
      // page title is "Feedback" (was "Customer Feedback" in an earlier spec)
      expect(screen.getByText('Feedback')).toBeInTheDocument();
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
