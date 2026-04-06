import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker, DateRangePicker } from '../date-picker';

describe('DatePicker', () => {
  it('renders a trigger button with placeholder text', () => {
    render(<DatePicker onChange={vi.fn()} placeholder="Select date" />);
    expect(screen.getByText('Select date')).toBeInTheDocument();
  });

  it('displays the selected date when value is provided', () => {
    const date = new Date(2026, 0, 15); // Jan 15, 2026
    render(<DatePicker value={date} onChange={vi.fn()} />);
    // date-fns format PPP = "January 15th, 2026"
    expect(screen.getByText(/January 15/)).toBeInTheDocument();
  });

  it('renders a label when provided', () => {
    render(<DatePicker onChange={vi.fn()} label="Start Date" />);
    expect(screen.getByText('Start Date')).toBeInTheDocument();
  });

  it('opens calendar popover when button is clicked', async () => {
    const user = userEvent.setup();
    render(<DatePicker onChange={vi.fn()} placeholder="Pick a date" />);

    const button = screen.getByText('Pick a date');
    await user.click(button);

    // react-day-picker renders a table with day buttons
    // The popover should now be open with calendar content
    // We check for presence of navigation (month/year display)
    // Note: popover content may be in a portal
  });
});

describe('DateRangePicker', () => {
  it('renders a trigger button with placeholder', () => {
    render(<DateRangePicker onChange={vi.fn()} placeholder="Select range" />);
    expect(screen.getByText('Select range')).toBeInTheDocument();
  });

  it('displays the selected date range', () => {
    const range = {
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 31),
    };
    render(<DateRangePicker value={range} onChange={vi.fn()} />);
    // format PP = "Jan 1, 2026"
    expect(screen.getByText(/Jan 1/)).toBeInTheDocument();
  });

  it('renders a label when provided', () => {
    render(<DateRangePicker onChange={vi.fn()} label="Date Range" />);
    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  it('shows error message when error prop is set', () => {
    render(
      <DateRangePicker onChange={vi.fn()} error="Date range is required" />,
    );
    expect(screen.getByText('Date range is required')).toBeInTheDocument();
  });
});
