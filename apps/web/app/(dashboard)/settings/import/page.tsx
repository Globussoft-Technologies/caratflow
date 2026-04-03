'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { ImportWizard } from '@/features/platform/ImportWizard';

interface ImportJob {
  id: string;
  fileName: string;
  entityType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  successRows: number;
  errorRows: number;
  createdAt: string;
}

const statusIcons: Record<string, { icon: typeof CheckCircle; color: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-600' },
  PROCESSING: { icon: Clock, color: 'text-blue-600' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-600' },
  FAILED: { icon: XCircle, color: 'text-red-600' },
};

export default function ImportPage() {
  const [showWizard, setShowWizard] = useState(false);

  // TODO: Fetch from API
  const importJobs: ImportJob[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        description="Bulk import customers, products, and suppliers from CSV or Excel files."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Import' },
        ]}
      />

      {!showWizard ? (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="h-4 w-4" />
              New Import
            </button>
          </div>

          {/* Import History */}
          {importJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
              <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No imports yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Start by uploading a CSV or Excel file.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">File</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Entity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rows</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {importJobs.map((job) => {
                    const statusConfig = statusIcons[job.status] ?? statusIcons.PENDING;
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={job.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-sm font-medium">{job.fileName}</td>
                        <td className="px-4 py-3 text-sm capitalize">{job.entityType}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-sm ${statusConfig.color}`}>
                            <StatusIcon className="h-4 w-4" />
                            {job.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {job.successRows}/{job.totalRows}
                          {job.errorRows > 0 && (
                            <span className="ml-1 text-red-600">({job.errorRows} errors)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <ImportWizard onClose={() => setShowWizard(false)} />
      )}
    </div>
  );
}
