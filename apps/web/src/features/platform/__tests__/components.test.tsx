import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Platform Feature Components', () => {
  describe('PermissionMatrix', () => {
    const mockCatalog = {
      inventory: [
        { resource: 'stock_items', action: 'read', description: 'View stock items' },
        { resource: 'stock_items', action: 'write', description: 'Manage stock items' },
      ],
      manufacturing: [
        { resource: 'job_orders', action: 'read', description: 'View job orders' },
      ],
    };

    it('renders permission grid with module headers', async () => {
      const { PermissionMatrix } = await import('../PermissionMatrix');
      render(
        <PermissionMatrix
          permissionCatalog={mockCatalog}
          selectedPermissions={[]}
          onPermissionsChange={vi.fn()}
        />,
      );
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Manufacturing')).toBeInTheDocument();
    });

    it('renders permission checkboxes', async () => {
      const { PermissionMatrix } = await import('../PermissionMatrix');
      const { container } = render(
        <PermissionMatrix
          permissionCatalog={mockCatalog}
          selectedPermissions={[]}
          onPermissionsChange={vi.fn()}
        />,
      );
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('ImportWizard', () => {
    it('renders upload step initially', async () => {
      const { ImportWizard } = await import('../ImportWizard');
      render(<ImportWizard onClose={vi.fn()} />);
      expect(screen.getAllByText(/upload/i).length).toBeGreaterThan(0);
    });

    it('renders entity type selection', async () => {
      const { ImportWizard } = await import('../ImportWizard');
      render(<ImportWizard onClose={vi.fn()} />);
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
    });
  });

  describe('AuditLogTable', () => {
    it('renders audit log entries', async () => {
      const { AuditLogTable } = await import('../AuditLogTable');
      const logs = [
        { id: '1', action: 'CREATE', entity: 'Product', userId: 'u1', timestamp: '2026-04-07', details: {} },
      ];
      render(<AuditLogTable logs={logs} type="audit" />);
      // Should render a table with at least one row
      expect(screen.queryByText('No audit logs')).not.toBeInTheDocument();
    });

    it('renders empty state for audit type', async () => {
      const { AuditLogTable } = await import('../AuditLogTable');
      render(<AuditLogTable logs={[]} type="audit" />);
      expect(screen.getByText('No audit logs')).toBeInTheDocument();
    });

    it('renders empty state for activity type', async () => {
      const { AuditLogTable } = await import('../AuditLogTable');
      render(<AuditLogTable logs={[]} type="activity" />);
      expect(screen.getByText('No activity logs')).toBeInTheDocument();
    });
  });

  describe('ColumnMapper', () => {
    it('renders source headers with mapping dropdowns', async () => {
      const { ColumnMapper } = await import('../ColumnMapper');
      render(
        <ColumnMapper
          sourceHeaders={['FullName', 'EmailAddr', 'PhoneNum']}
          entityType="customer"
          mapping={{}}
          onMappingChange={vi.fn()}
        />,
      );
      expect(screen.getByText('FullName')).toBeInTheDocument();
      expect(screen.getByText('EmailAddr')).toBeInTheDocument();
      expect(screen.getByText('PhoneNum')).toBeInTheDocument();
    });

    it('renders target field options for customer entity', async () => {
      const { ColumnMapper } = await import('../ColumnMapper');
      render(
        <ColumnMapper
          sourceHeaders={['Col1']}
          entityType="customer"
          mapping={{}}
          onMappingChange={vi.fn()}
        />,
      );
      // The dropdown should contain customer-specific target fields
      expect(screen.getAllByText(/First Name/).length).toBeGreaterThan(0);
    });
  });
});
