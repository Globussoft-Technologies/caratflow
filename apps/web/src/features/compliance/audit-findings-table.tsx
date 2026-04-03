'use client';

import { StatusBadge, getStatusVariant } from '@caratflow/ui';

interface Audit {
  id: string;
  auditType: string;
  auditDate: string;
  auditorName: string;
  status: string;
  findings: string | null;
}

interface AuditFindingsTableProps {
  audits: Audit[];
}

export function AuditFindingsTable({ audits }: AuditFindingsTableProps) {
  if (audits.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-6">
        No audits scheduled.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Auditor</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 font-medium">Findings</th>
          </tr>
        </thead>
        <tbody>
          {audits.map((audit) => (
            <tr key={audit.id} className="border-b last:border-0">
              <td className="py-2 pr-4">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  {audit.auditType}
                </span>
              </td>
              <td className="py-2 pr-4 text-xs">
                {new Date(audit.auditDate).toLocaleDateString()}
              </td>
              <td className="py-2 pr-4 text-xs">{audit.auditorName}</td>
              <td className="py-2 pr-4">
                <StatusBadge label={audit.status} variant={getStatusVariant(audit.status)} />
              </td>
              <td className="py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                {audit.findings ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
