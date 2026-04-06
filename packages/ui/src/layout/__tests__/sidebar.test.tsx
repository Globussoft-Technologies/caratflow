import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar, defaultNavItems } from '../sidebar';

describe('Sidebar', () => {
  it('renders navigation items', () => {
    render(<Sidebar collapsed={false} onToggle={vi.fn()} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Manufacturing')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('highlights the active item based on currentPath', () => {
    const { container } = render(
      <Sidebar collapsed={false} onToggle={vi.fn()} currentPath="/dashboard" />,
    );
    // The Dashboard link should have the active styling class
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const wrapper = dashboardLink?.closest('div[class*="mx-2"]');
    expect(wrapper?.className).toContain('bg-primary');
  });

  it('toggles collapse when toggle button is clicked', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();
    render(<Sidebar collapsed={false} onToggle={handleToggle} />);

    // The collapse toggle button is the last button in the sidebar
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons[buttons.length - 1];
    await user.click(toggleButton);

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('renders module sections with expandable children', async () => {
    const user = userEvent.setup();
    render(<Sidebar collapsed={false} onToggle={vi.fn()} />);

    // Click on Inventory to expand its children
    const inventoryButton = screen.getByText('Inventory');
    await user.click(inventoryButton);

    expect(screen.getByText('Stock Overview')).toBeInTheDocument();
    expect(screen.getByText('Stock Transfer')).toBeInTheDocument();
  });

  it('hides labels when collapsed', () => {
    render(<Sidebar collapsed={true} onToggle={vi.fn()} />);
    // When collapsed, text labels should not be rendered
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('CaratFlow')).not.toBeInTheDocument();
  });
});
