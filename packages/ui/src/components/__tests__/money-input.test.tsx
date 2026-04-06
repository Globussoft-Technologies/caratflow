import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoneyInput } from '../money-input';

describe('MoneyInput', () => {
  it('renders with a currency label', () => {
    render(<MoneyInput value={0} onChange={vi.fn()} label="Amount" />);
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('displays the currency symbol (INR default)', () => {
    render(<MoneyInput value={0} onChange={vi.fn()} />);
    expect(screen.getByText('\u20B9')).toBeInTheDocument();
  });

  it('displays the correct symbol for USD', () => {
    render(<MoneyInput value={0} onChange={vi.fn()} currencyCode="USD" />);
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('accepts numeric input and calls onChange with paise value', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<MoneyInput value={0} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '150.50');

    // onChange should be called with paise value (150.50 * 100 = 15050)
    expect(handleChange).toHaveBeenLastCalledWith(15050);
  });

  it('strips non-numeric characters from input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<MoneyInput value={0} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'abc123');

    // Only the numeric portion should trigger onChange
    expect(handleChange).toHaveBeenCalled();
    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
    expect(lastCall).toBe(12300); // 123 * 100
  });

  it('formats display value on blur', async () => {
    const user = userEvent.setup();
    render(<MoneyInput value={0} onChange={vi.fn()} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '5');
    await user.tab(); // blur

    expect(input).toHaveValue('5.00');
  });

  it('handles zero value correctly', () => {
    render(<MoneyInput value={0} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('0.00');
  });

  it('shows an error message when error prop is set', () => {
    render(<MoneyInput value={0} onChange={vi.fn()} error="Amount is required" />);
    expect(screen.getByText('Amount is required')).toBeInTheDocument();
  });
});
