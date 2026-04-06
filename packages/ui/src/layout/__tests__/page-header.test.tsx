import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../page-header';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Inventory" />);
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inventory');
  });

  it('renders breadcrumbs', () => {
    render(
      <PageHeader
        title="Stock Overview"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: 'Stock Overview' },
        ]}
      />,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    // "Stock Overview" appears in both breadcrumb and title
    const matches = screen.getAllByText('Stock Overview');
    expect(matches.length).toBe(2);
    // Breadcrumb renders as a <span>, title as <h1>
    expect(matches.some((el) => el.tagName === 'SPAN')).toBe(true);
    expect(matches.some((el) => el.tagName === 'H1')).toBe(true);
  });

  it('renders action buttons', () => {
    render(
      <PageHeader
        title="Products"
        actions={<button>Add Product</button>}
      />,
    );
    expect(screen.getByText('Add Product')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(
      <PageHeader
        title="Dashboard"
        description="Overview of your jewelry business"
      />,
    );
    expect(screen.getByText('Overview of your jewelry business')).toBeInTheDocument();
  });
});
