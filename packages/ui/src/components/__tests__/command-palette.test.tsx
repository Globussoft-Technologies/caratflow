import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../command-palette';

const items = [
  { id: '1', label: 'Go to Dashboard', group: 'Navigation', onSelect: vi.fn() },
  { id: '2', label: 'Go to Inventory', group: 'Navigation', onSelect: vi.fn() },
  { id: '3', label: 'Create Invoice', group: 'Actions', onSelect: vi.fn() },
  { id: '4', label: 'Search Products', group: 'Actions', onSelect: vi.fn() },
];

describe('CommandPalette', () => {
  it('opens with Ctrl+K and renders the search input', async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} />);

    // Open the palette with Ctrl+K
    await user.keyboard('{Control>}k{/Control}');

    const input = screen.getByPlaceholderText('Type a command or search...');
    expect(input).toBeInTheDocument();
  });

  it('shows command items when open', async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} />);

    await user.keyboard('{Control>}k{/Control}');

    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Create Invoice')).toBeInTheDocument();
  });

  it('groups items under headings', async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} />);

    await user.keyboard('{Control>}k{/Control}');

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('calls onSelect when an item is clicked', async () => {
    const user = userEvent.setup();
    const selectHandler = vi.fn();
    const testItems = [
      { id: '1', label: 'Test Action', onSelect: selectHandler },
    ];
    render(<CommandPalette items={testItems} />);

    await user.keyboard('{Control>}k{/Control}');
    await user.click(screen.getByText('Test Action'));

    expect(selectHandler).toHaveBeenCalledTimes(1);
  });
});
