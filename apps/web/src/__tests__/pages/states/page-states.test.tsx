import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for loading / empty / error rendering states of the templated list pages.
 *
 * We override the default tRPC mock from setup.tsx with a stateful proxy that
 * reads from a mutable `queryState` object. Tests set that state before
 * rendering the page. This file owns its own trpc mock via `vi.mock` at the
 * top level, which takes precedence over the setup.tsx mock.
 */

const queryState: {
  data: unknown;
  isLoading: boolean;
  error: unknown;
} = {
  data: undefined,
  isLoading: false,
  error: null,
};

vi.mock('@/lib/trpc', () => {
  function createProxy(): unknown {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop: string) {
        if (prop === 'useQuery') {
          return () => ({
            data: queryState.data,
            isLoading: queryState.isLoading,
            error: queryState.error,
            refetch: vi.fn(),
          });
        }
        if (prop === 'useMutation') {
          return () => ({
            mutate: vi.fn(),
            isPending: false,
            error: null,
            isSuccess: false,
            isError: false,
          });
        }
        return createProxy();
      },
    };
    return new Proxy({}, handler);
  }
  return { trpc: createProxy() };
});

function resetState() {
  queryState.data = undefined;
  queryState.isLoading = false;
  queryState.error = null;
}

describe('List page states', () => {
  beforeEach(() => {
    resetState();
  });

  describe('Stock Items page', () => {
    it('shows DataTable Loading cell when isLoading=true', async () => {
      queryState.isLoading = true;
      const { default: Page } = await import(
        '../../../../app/(dashboard)/inventory/items/page'
      );
      render(<Page />);
      // The UI-mock DataTable renders "Loading..." when isLoading is true
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders empty table when data has no items', async () => {
      queryState.data = { items: [], total: 0 };
      const { default: Page } = await import(
        '../../../../app/(dashboard)/inventory/items/page'
      );
      render(<Page />);
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
      // No row cells
      expect(screen.queryAllByText('row').length).toBe(0);
    });
  });

  describe('BOM list page', () => {
    it('renders page header in empty state', async () => {
      queryState.data = { items: [], total: 0 };
      const { default: Page } = await import(
        '../../../../app/(dashboard)/manufacturing/bom/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('Finance invoices page', () => {
    it('renders page header when query errors', async () => {
      queryState.error = new Error('Network error');
      const { default: Page } = await import(
        '../../../../app/(dashboard)/finance/invoices/page'
      );
      render(<Page />);
      // Page still renders its shell even on error
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('CRM customers page', () => {
    it('renders empty-state when customer list is empty', async () => {
      queryState.data = { data: [], total: 0, page: 1, limit: 20 };
      const { default: Page } = await import(
        '../../../../app/(dashboard)/crm/customers/page'
      );
      render(<Page />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  describe('Wholesale purchase orders page', () => {
    it('renders loading state', async () => {
      queryState.isLoading = true;
      const { default: Page } = await import(
        '../../../../app/(dashboard)/wholesale/purchase-orders/page'
      );
      render(<Page />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Compliance HUID page', () => {
    it('renders the page header', async () => {
      queryState.data = { items: [], total: 0 };
      const { default: Page } = await import(
        '../../../../app/(dashboard)/compliance/huid/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('Ecommerce orders page', () => {
    it('renders page header in empty state', async () => {
      queryState.data = { items: [], total: 0 };
      const { default: Page } = await import(
        '../../../../app/(dashboard)/ecommerce/orders/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('Export orders page', () => {
    it('renders page header in empty state', async () => {
      queryState.data = { data: [], total: 0 };
      const { default: Page } = await import(
        '../../../../app/(dashboard)/export/orders/page'
      );
      render(<Page />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  describe('CMS banners page', () => {
    it('renders without crashing in empty state', async () => {
      queryState.data = { items: [], total: 0 };
      const { default: Page } = await import(
        '../../../../app/(dashboard)/cms/banners/page'
      );
      const { container } = render(<Page />);
      expect(container).toBeTruthy();
    });
  });
});
