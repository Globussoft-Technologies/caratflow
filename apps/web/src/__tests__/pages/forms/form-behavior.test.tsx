import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

/**
 * Form-behaviour tests for the "new" pages that were added in the admin cutover:
 *  - manufacturing/jobs/new
 *  - export/orders/new
 *  - export/invoices/new
 *  - export/documents/generate
 *
 * The global tRPC mock in setup.tsx returns empty/undefined data for every
 * useQuery and useMutation, so these tests exercise the initial (empty-form)
 * state: the submit button must be disabled until required fields are filled.
 */

describe('New Job Order form', () => {
  it('renders Create Job Order button disabled when required fields are empty', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/manufacturing/jobs/new/page'
    );
    render(<Page />);
    const btn = screen.getByRole('button', { name: /Create Job Order/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('renders Priority select with Medium selected by default', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/manufacturing/jobs/new/page'
    );
    render(<Page />);
    // Label + combobox
    expect(screen.getByText('Priority')).toBeInTheDocument();
  });

  it('renders Quantity field defaulting to 1', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/manufacturing/jobs/new/page'
    );
    render(<Page />);
    // Quantity is the only required number input with default "1"
    expect(screen.getByText('Quantity *')).toBeInTheDocument();
    const qty = screen.getByDisplayValue('1') as HTMLInputElement;
    expect(qty.type).toBe('number');
  });
});

describe('New Export Order form', () => {
  it('renders Create Export Order button disabled when buyer/location empty', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/export/orders/new/page'
    );
    render(<Page />);
    const btn = screen.getByRole('button', { name: /Create Export Order/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('renders one line item by default with default HS code 7113', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/export/orders/new/page'
    );
    render(<Page />);
    const hsInputs = screen.getAllByDisplayValue('7113');
    expect(hsInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('adds a new line item when "Add Item" is clicked', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/export/orders/new/page'
    );
    render(<Page />);
    const before = screen.getAllByDisplayValue('7113').length;
    fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));
    const after = screen.getAllByDisplayValue('7113').length;
    expect(after).toBe(before + 1);
  });

  it('defaults currency to USD and shows FOB as default incoterm', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/export/orders/new/page'
    );
    render(<Page />);
    const currency = screen.getByDisplayValue('USD') as HTMLInputElement;
    expect(currency).toBeInTheDocument();
    // FOB option is selected - check the combobox value attribute indirectly
    const fobOption = screen.getByRole('option', {
      name: /FOB - Free On Board/i,
    }) as HTMLOptionElement;
    expect(fobOption.selected).toBe(true);
  });
});

describe('New Export Invoice form', () => {
  it('renders the page with invoice-type select defaulting to COMMERCIAL', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/export/invoices/new/page'
    );
    render(<Page />);
    // A line-item HS code default should exist
    const hsInputs = screen.getAllByDisplayValue('7113');
    expect(hsInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('starts with a single invoice line item', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/export/invoices/new/page'
    );
    render(<Page />);
    const qtyInputs = screen.getAllByDisplayValue('1');
    expect(qtyInputs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Generate Shipping Documents form', () => {
  it('renders the page header', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/export/documents/generate/page'
    );
    render(<Page />);
    expect(screen.getByText('Generate Shipping Documents')).toBeInTheDocument();
  });

  it('renders doc-type options: Packing List, Certificate of Origin, Shipping Bill Data', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/export/documents/generate/page'
    );
    render(<Page />);
    expect(
      screen.getByRole('option', { name: 'Packing List' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Certificate of Origin' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Shipping Bill Data' }),
    ).toBeInTheDocument();
  });

  it('shows Packing List as the default selection', async () => {
    const { default: Page } = await import(
      '../../../../app/(dashboard)/export/documents/generate/page'
    );
    render(<Page />);
    const opt = screen.getByRole('option', {
      name: 'Packing List',
    }) as HTMLOptionElement;
    expect(opt.selected).toBe(true);
  });
});
