import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Settings Pages', () => {
  describe('Settings Hub', () => {
    it('renders with page header title "Settings"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/page');
      render(<Page />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders settings category cards', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/page');
      render(<Page />);
      expect(screen.getByText('Company Profile')).toBeInTheDocument();
      expect(screen.getByText('Branches')).toBeInTheDocument();
    });
  });

  describe('Company Profile Page', () => {
    it('renders with page header title "Company Profile"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/company/page');
      render(<Page />);
      expect(screen.getByText('Company Profile')).toBeInTheDocument();
    });
  });

  describe('Branches Page', () => {
    it('renders with page header title "Branches"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/branches/page');
      render(<Page />);
      expect(screen.getByText('Branches')).toBeInTheDocument();
    });
  });

  describe('Users Page', () => {
    it('renders with page header title "Users"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/users/page');
      render(<Page />);
      expect(screen.getByText('Users')).toBeInTheDocument();
    });
  });

  describe('Roles Page', () => {
    it('renders with page header title "Roles & Permissions"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/roles/page');
      render(<Page />);
      expect(screen.getByText('Roles & Permissions')).toBeInTheDocument();
    });
  });

  describe('Tax Configuration Page', () => {
    it('renders with page header title "Tax Configuration"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/tax/page');
      render(<Page />);
      expect(screen.getByText('Tax Configuration')).toBeInTheDocument();
    });
  });

  describe('POS Settings Page', () => {
    it('renders with page header title "POS Settings"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/pos/page');
      render(<Page />);
      expect(screen.getByText('POS Settings')).toBeInTheDocument();
    });
  });

  describe('Notification Settings Page', () => {
    it('renders with page header title "Notification Settings"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/notifications/page');
      render(<Page />);
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });
  });

  describe('Import Page', () => {
    it('renders with page header title "Data Import"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/import/page');
      render(<Page />);
      // title is "Data Import" (was "Import Data" earlier)
      expect(screen.getByText('Data Import')).toBeInTheDocument();
    });
  });

  describe('Export Page', () => {
    it('renders with page header title "Export Data"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/export/page');
      render(<Page />);
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });
  });

  describe('Audit Log Page', () => {
    it('renders with page header title "Audit Log"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/audit/page');
      render(<Page />);
      expect(screen.getByText('Audit Log')).toBeInTheDocument();
    });
  });

  describe('Translations Page', () => {
    it('renders with page header title "Translations"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/settings/i18n/page');
      render(<Page />);
      expect(screen.getByText('Translations')).toBeInTheDocument();
    });
  });
});
