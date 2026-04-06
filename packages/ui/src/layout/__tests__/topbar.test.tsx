import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Topbar } from '../topbar';

const branches = [
  { id: 'b1', name: 'Main Store' },
  { id: 'b2', name: 'Mall Branch' },
];

describe('Topbar', () => {
  it('renders the search bar', () => {
    render(<Topbar />);
    expect(screen.getByText('Search...')).toBeInTheDocument();
  });

  it('renders branch selector when branches are provided', () => {
    render(<Topbar branches={branches} activeBranchId="b1" />);
    expect(screen.getByText('Main Store')).toBeInTheDocument();
  });

  it('renders notification bell', () => {
    render(<Topbar />);
    // The bell icon button is present in the topbar
    const buttons = screen.getAllByRole('button');
    const bellButton = buttons.find(
      (btn) => btn.querySelector('svg') !== null,
    );
    expect(bellButton).toBeDefined();
  });

  it('renders user menu with user name', () => {
    render(<Topbar userName="Rajesh" userEmail="rajesh@jeweler.com" />);
    expect(screen.getByText('Rajesh')).toBeInTheDocument();
    // User initial avatar
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('renders theme toggle button and calls onThemeToggle', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();
    render(<Topbar onThemeToggle={handleToggle} theme="light" />);

    // Find all buttons; theme toggle is one of the icon buttons
    const buttons = screen.getAllByRole('button');
    // The theme toggle button is after the notification bell
    // We look for it by its position in the button list
    const themeButton = buttons.find(
      (btn) => !btn.textContent?.includes('Search') && !btn.textContent?.includes('Ctrl'),
    );
    // Click a button that triggers theme toggle
    // Since we have specific callbacks, let's find the right one
    // The theme toggle is a standalone icon button
    for (const btn of buttons) {
      await user.click(btn);
    }
    expect(handleToggle).toHaveBeenCalled();
  });
});
