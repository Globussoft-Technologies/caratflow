import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../stat-card';

describe('StatCard', () => {
  it('renders value and title', () => {
    render(<StatCard title="Revenue" value="$12,500" />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$12,500')).toBeInTheDocument();
  });

  it('renders the icon when provided', () => {
    render(
      <StatCard
        title="Orders"
        value="42"
        icon={<span data-testid="test-icon">icon</span>}
      />,
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('shows positive trend with percentage', () => {
    render(
      <StatCard
        title="Sales"
        value="$5,000"
        trend={{ value: 12.5, label: 'vs last month' }}
      />,
    );
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('shows negative trend with percentage', () => {
    render(
      <StatCard
        title="Returns"
        value="$200"
        trend={{ value: -3.2, label: 'vs last week' }}
      />,
    );
    expect(screen.getByText('-3.2%')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('renders formatted large number values', () => {
    render(<StatCard title="Total Items" value="1,234,567" />);
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });
});
