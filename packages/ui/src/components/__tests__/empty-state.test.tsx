import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('renders the title message', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState title="No items" description="Try adjusting your filters" />,
    );
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('renders a custom icon when provided', () => {
    render(
      <EmptyState
        title="No data"
        icon={<span data-testid="custom-icon">custom</span>}
      />,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders an action button that fires onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={<button onClick={handleClick}>Add Item</button>}
      />,
    );

    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
