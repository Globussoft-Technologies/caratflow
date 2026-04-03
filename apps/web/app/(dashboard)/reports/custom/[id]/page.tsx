'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { ReportTable, ExportButton } from '@/features/reporting';
import { RefreshCw } from 'lucide-react';

export default function SavedReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [loading, setLoading] = React.useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    // In production, re-execute the saved report via tRPC
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(false);
  };

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    console.log(`Exporting saved report ${reportId} as ${format}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saved Report"
        description={`Report ID: ${reportId}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Custom', href: '/reports/custom' },
          { label: 'View' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <ExportButton onExport={handleExport} />
          </div>
        }
      />

      {/* Report results would load via tRPC getSavedReport + executeCustomReport */}
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground mb-4">
          This page loads the saved report configuration and re-executes it.
          The report parameters (entity, columns, filters, aggregations) are stored
          and can be refreshed at any time.
        </p>
        <ReportTable
          columns={[
            { key: 'col1', label: 'Column 1' },
            { key: 'col2', label: 'Column 2' },
            { key: 'col3', label: 'Column 3' },
          ]}
          data={[]}
          emptyMessage="Run the report to see results"
          onExport={handleExport}
        />
      </div>
    </div>
  );
}
