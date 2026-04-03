'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Download, FileSpreadsheet, CheckCircle, Clock, XCircle } from 'lucide-react';

interface ExportJob {
  id: string;
  entityType: string;
  format: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  fileUrl: string | null;
  createdAt: string;
}

export default function ExportPage() {
  const [formData, setFormData] = useState({
    entityType: 'customer',
    format: 'CSV' as 'CSV' | 'XLSX' | 'PDF',
    search: '',
  });
  const [isExporting, setIsExporting] = useState(false);

  // TODO: Fetch from API
  const exportJobs: ExportJob[] = [];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // TODO: Call trpc.platform.export.create.mutate
      console.log('Starting export:', formData);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Data"
        description="Export your data to CSV, Excel, or PDF formats."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Export' },
        ]}
      />

      {/* Export Form */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">New Export</h2>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium" htmlFor="entity-type">Data Type</label>
              <select id="entity-type" value={formData.entityType} onChange={(e) => setFormData({ ...formData, entityType: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                <option value="customer">Customers</option>
                <option value="product">Products</option>
                <option value="supplier">Suppliers</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="export-format">Format</label>
              <select id="export-format" value={formData.format} onChange={(e) => setFormData({ ...formData, format: e.target.value as 'CSV' | 'XLSX' | 'PDF' })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                <option value="CSV">CSV</option>
                <option value="XLSX">Excel (XLSX)</option>
                <option value="PDF">PDF</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="export-search">Filter (optional)</label>
              <input id="export-search" type="text" value={formData.search} onChange={(e) => setFormData({ ...formData, search: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="Search term..." />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleExport} disabled={isExporting} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Start Export'}
            </button>
          </div>
        </div>
      </div>

      {/* Export History */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Export History</h2>
        </div>
        {exportJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No exports yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Entity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Format</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rows</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {exportJobs.map((job) => (
                <tr key={job.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm capitalize">{job.entityType}</td>
                  <td className="px-4 py-3 text-sm">{job.format}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-sm ${job.status === 'COMPLETED' ? 'text-green-600' : job.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {job.status === 'COMPLETED' ? <CheckCircle className="h-4 w-4" /> : job.status === 'FAILED' ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{job.totalRows}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(job.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {job.status === 'COMPLETED' && job.fileUrl && (
                      <a href={job.fileUrl} className="text-sm font-medium text-primary hover:underline" download>Download</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
