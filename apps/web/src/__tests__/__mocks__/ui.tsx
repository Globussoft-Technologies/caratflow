import * as React from 'react';

export function PageHeader({ title, description }: { title: string; description?: string; breadcrumbs?: unknown[]; actions?: React.ReactNode; className?: string; renderLink?: unknown }) {
  return (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}

export function StatCard({ title, value, isLoading }: { title: string; value: string; icon?: React.ReactNode; isLoading?: boolean; subtitle?: string }) {
  return (
    <div data-testid="stat-card">
      <span>{title}</span>
      <span>{isLoading ? '...' : value}</span>
    </div>
  );
}

export function DataTable({ columns, data, isLoading }: { columns: unknown[]; data: unknown[]; isLoading?: boolean; pageSize?: number; onRowClick?: (row: unknown) => void }) {
  return (
    <table data-testid="data-table">
      <thead>
        <tr>
          {(columns as Array<{ header?: string }>).map((col, i) => (
            <th key={i}>{typeof col.header === 'string' ? col.header : ''}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <tr><td>Loading...</td></tr>
        ) : (
          (data as unknown[]).map((_, i) => <tr key={i}><td>row</td></tr>)
        )}
      </tbody>
    </table>
  );
}

// ColumnDef type stub - avoids needing @tanstack/react-table resolution
export type ColumnDef<TData = unknown, TValue = unknown> = {
  accessorKey?: string;
  header?: string;
  id?: string;
  cell?: (info: { row: { original: TData }; getValue: () => TValue }) => unknown;
};

export function StatusBadge({ label }: { label: string; variant?: string }) {
  return <span data-testid="status-badge">{label}</span>;
}

export function getStatusVariant(_status: string) {
  return 'info' as const;
}

export function FormField({ label, children, required }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div data-testid="form-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Dialog({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return open !== false ? <div data-testid="dialog" role="dialog">{children}</div> : null;
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div>{children}</div>;
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2>{children}</h2>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function DialogClose({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function ConfirmModal() {
  return null;
}

export function EmptyState({ title }: { title: string }) {
  return <div data-testid="empty-state">{title}</div>;
}

export function MoneyInput() {
  return <input data-testid="money-input" />;
}

export function WeightInput() {
  return <input data-testid="weight-input" />;
}

export function CommandPalette() {
  return null;
}

export function DatePicker() {
  return <input data-testid="date-picker" />;
}

export function DateRangePicker() {
  return <div data-testid="date-range-picker" />;
}

export function cn(...args: unknown[]) {
  return args.filter(Boolean).join(' ');
}
