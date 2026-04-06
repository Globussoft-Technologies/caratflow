import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Settings Detail Pages', () => {
  describe('Branch Detail [id]', () => {
    it('renders with page header title "Branch Details"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/settings/branches/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('Branch Details')).toBeInTheDocument();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/settings/branches/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });

    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/settings/branches/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });
  });

  describe('User Detail [id]', () => {
    it('renders with page header title "User Profile"', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/settings/users/[id]/page'
      );
      render(<Page />);
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    it('renders page header element', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/settings/users/[id]/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });

    it('renders without crashing', async () => {
      const { default: Page } = await import(
        '../../../../app/(dashboard)/settings/users/[id]/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });
  });
});
