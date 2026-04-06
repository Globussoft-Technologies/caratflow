import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, getStatusVariant } from '../status-badge';

describe('StatusBadge', () => {
  it('renders the status label text', () => {
    render(<StatusBadge label="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies success variant styles for success status', () => {
    const { container } = render(<StatusBadge label="Active" variant="success" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('emerald');
  });

  it('applies warning variant styles for pending status', () => {
    const { container } = render(<StatusBadge label="Pending" variant="warning" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('amber');
  });

  it('applies danger variant styles for error/failed status', () => {
    const { container } = render(<StatusBadge label="Failed" variant="danger" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('red');
  });

  it('applies info variant styles', () => {
    const { container } = render(<StatusBadge label="Confirmed" variant="info" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('blue');
  });

  it('renders a dot indicator by default', () => {
    const { container } = render(<StatusBadge label="Active" variant="success" />);
    const dot = container.querySelector('span > span');
    expect(dot).toBeInTheDocument();
    expect(dot?.className).toContain('rounded-full');
  });
});

describe('getStatusVariant', () => {
  it('returns success for ACTIVE', () => {
    expect(getStatusVariant('ACTIVE')).toBe('success');
  });

  it('returns warning for PENDING', () => {
    expect(getStatusVariant('PENDING')).toBe('warning');
  });

  it('returns danger for FAILED', () => {
    expect(getStatusVariant('FAILED')).toBe('danger');
  });

  it('returns info for CONFIRMED', () => {
    expect(getStatusVariant('CONFIRMED')).toBe('info');
  });

  it('returns muted for DRAFT', () => {
    expect(getStatusVariant('DRAFT')).toBe('muted');
  });

  it('returns default for unknown statuses', () => {
    expect(getStatusVariant('SOMETHING_ELSE')).toBe('default');
  });
});
