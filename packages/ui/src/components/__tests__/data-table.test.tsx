import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type ColumnDef } from '../data-table';

interface TestRow {
  id: string;
  name: string;
  status: string;
}

const columns: ColumnDef<TestRow, unknown>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
];

const sampleData: TestRow[] = [
  { id: '1', name: 'Gold Ring', status: 'Active' },
  { id: '2', name: 'Silver Necklace', status: 'Pending' },
  { id: '3', name: 'Diamond Pendant', status: 'Active' },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={sampleData} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders row data', () => {
    render(<DataTable columns={columns} data={sampleData} />);
    expect(screen.getByText('Gold Ring')).toBeInTheDocument();
    expect(screen.getByText('Silver Necklace')).toBeInTheDocument();
    expect(screen.getByText('Diamond Pendant')).toBeInTheDocument();
  });

  it('renders sortable column indicators', () => {
    render(<DataTable columns={columns} data={sampleData} />);
    // Each sortable column header should have the ArrowUpDown icon
    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBe(3);
  });

  it('sorts column when header is clicked', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={sampleData} />);

    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);

    // After sort ascending, Diamond Pendant should come first
    const rows = screen.getAllByRole('row');
    // First row is header, data rows follow
    const firstDataRow = rows[1];
    expect(within(firstDataRow).getByText('Diamond Pendant')).toBeInTheDocument();
  });

  it('renders pagination controls', () => {
    render(<DataTable columns={columns} data={sampleData} />);
    expect(screen.getByText(/Page \d+ of \d+/)).toBeInTheDocument();
    // 4 pagination buttons (first, prev, next, last)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('shows empty state when data is empty', () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText('No results.')).toBeInTheDocument();
  });

  it('renders search/filter input when searchKey is provided', () => {
    render(
      <DataTable
        columns={columns}
        data={sampleData}
        searchKey="name"
        searchPlaceholder="Search items..."
      />,
    );
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
  });

  it('filters rows when search input changes', async () => {
    const user = userEvent.setup();
    render(
      <DataTable columns={columns} data={sampleData} searchKey="name" />,
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'Gold');

    expect(screen.getByText('Gold Ring')).toBeInTheDocument();
    expect(screen.queryByText('Silver Necklace')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DataTable columns={columns} data={[]} isLoading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fires onRowClick when a row is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<DataTable columns={columns} data={sampleData} onRowClick={handleClick} />);

    await user.click(screen.getByText('Gold Ring'));
    expect(handleClick).toHaveBeenCalledWith(sampleData[0]);
  });
});
