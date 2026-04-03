'use client';

import { FileText, Activity } from 'lucide-react';

interface AuditLogTableProps {
  logs: Record<string, unknown>[];
  type: 'audit' | 'activity';
}

/**
 * AuditLogTable: Renders audit log or activity log entries in a table.
 * Supports both data change logs and user activity logs.
 */
export function AuditLogTable({ logs, type }: AuditLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
        {type === 'audit' ? (
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        ) : (
          <Activity className="mb-4 h-12 w-12 text-muted-foreground" />
        )}
        <h3 className="text-lg font-semibold">
          {type === 'audit' ? 'No audit logs' : 'No activity logs'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {type === 'audit'
            ? 'Data changes will appear here as they happen.'
            : 'User activities will appear here as they happen.'}
        </p>
      </div>
    );
  }

  if (type === 'audit') {
    return (
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Timestamp</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Entity</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => {
              const user = log.user as Record<string, unknown> | undefined;
              return (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {log.createdAt ? new Date(log.createdAt as string).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user ? `${user.firstName} ${user.lastName}` : (log.userId as string) ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {log.action as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-mono text-xs">{log.entityType as string}</span>
                    <span className="ml-1 text-muted-foreground">#{String(log.entityId ?? '').slice(0, 8)}</span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-muted-foreground">
                    {log.newValues ? JSON.stringify(log.newValues).slice(0, 80) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Activity logs
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Timestamp</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">IP Address</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {log.createdAt ? new Date(log.createdAt as string).toLocaleString() : '-'}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {log.action as string}
                </span>
              </td>
              <td className="max-w-sm truncate px-4 py-3 text-sm">
                {(log.description as string) ?? '-'}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {(log.ipAddress as string) ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
