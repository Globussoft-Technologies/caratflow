import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaginationControls } from '@/components/pagination-controls';

describe('PaginationControls', () => {
  it('renders nothing when totalPages <= 1', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PaginationControls
        page={1}
        totalPages={1}
        hasPrevious={false}
        hasNext={false}
        onChange={onChange}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "Page X of Y" and Previous/Next buttons when multi-page', () => {
    render(
      <PaginationControls
        page={2}
        totalPages={5}
        hasPrevious={true}
        hasNext={true}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('calls onChange(page - 1) when Previous clicked', () => {
    const onChange = vi.fn();
    render(
      <PaginationControls
        page={3}
        totalPages={5}
        hasPrevious={true}
        hasNext={true}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange(page + 1) when Next clicked', () => {
    const onChange = vi.fn();
    render(
      <PaginationControls
        page={3}
        totalPages={5}
        hasPrevious={true}
        hasNext={true}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('disables Previous at the first page', () => {
    render(
      <PaginationControls
        page={1}
        totalPages={5}
        hasPrevious={false}
        hasNext={true}
        onChange={vi.fn()}
      />,
    );
    const prev = screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it('disables Next at the last page', () => {
    render(
      <PaginationControls
        page={5}
        totalPages={5}
        hasPrevious={true}
        hasNext={false}
        onChange={vi.fn()}
      />,
    );
    const next = screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it('clamps Previous click to minimum of 1', () => {
    const onChange = vi.fn();
    render(
      <PaginationControls
        page={1}
        totalPages={3}
        hasPrevious={true}
        hasNext={true}
        onChange={onChange}
      />,
    );
    // Even though hasPrevious is true, clicking Previous from page 1 should clamp to 1
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
