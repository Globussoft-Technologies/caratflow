import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeightInput } from '../weight-input';

describe('WeightInput', () => {
  it('renders with a unit selector', () => {
    render(<WeightInput value={0} onChange={vi.fn()} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('g');
  });

  it('renders with a label', () => {
    render(<WeightInput value={0} onChange={vi.fn()} label="Weight" />);
    expect(screen.getByText('Weight')).toBeInTheDocument();
  });

  it('accepts numeric input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<WeightInput value={0} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '10');

    expect(handleChange).toHaveBeenCalled();
  });

  it('calls onChange with milligram value (grams unit)', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<WeightInput value={0} onChange={handleChange} unit="g" />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '5');

    // 5 grams = 5000 mg
    expect(handleChange).toHaveBeenLastCalledWith(5000);
  });

  it('calls onChange with milligram value (carat unit)', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<WeightInput value={0} onChange={handleChange} unit="ct" />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '3');

    // 3 carats = 3 * 200 = 600 mg
    expect(handleChange).toHaveBeenLastCalledWith(600);
  });

  it('shows conversion display when value is non-zero', () => {
    // 10000 mg = 10g, show conversions to ct and tola (first two "others" != g)
    render(<WeightInput value={10000} onChange={vi.fn()} unit="g" showConversion />);
    // The conversion paragraph contains both ct and tola separated by |
    const conversionEl = screen.getByText(/\|/);
    expect(conversionEl).toBeInTheDocument();
    expect(conversionEl.textContent).toMatch(/ct/);
    expect(conversionEl.textContent).toMatch(/tola/);
  });

  it('handles decimal input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<WeightInput value={0} onChange={handleChange} unit="g" />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '2.5');

    // 2.5 grams = 2500 mg
    expect(handleChange).toHaveBeenLastCalledWith(2500);
  });

  it('shows error message when error prop is set', () => {
    render(<WeightInput value={0} onChange={vi.fn()} error="Weight is required" />);
    expect(screen.getByText('Weight is required')).toBeInTheDocument();
  });
});
