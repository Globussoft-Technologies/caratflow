'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { CustomReportBuilder, ReportTable, ExportButton } from '@/features/reporting';
import type { SupportedEntity, CustomReportResponse } from '@caratflow/shared-types';

// Mock entities -- in production, loaded from tRPC getSupportedEntities()
const MOCK_ENTITIES: SupportedEntity[] = [
  {
    name: 'sales',
    label: 'Sales',
    fields: [
      { name: 'saleNumber', label: 'Sale Number', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'status', label: 'Status', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'totalPaise', label: 'Total (Paise)', type: 'number', filterable: true, sortable: true, aggregatable: true },
      { name: 'taxPaise', label: 'Tax (Paise)', type: 'number', filterable: true, sortable: true, aggregatable: true },
      { name: 'createdAt', label: 'Created At', type: 'date', filterable: true, sortable: true, aggregatable: false },
    ],
  },
  {
    name: 'products',
    label: 'Products',
    fields: [
      { name: 'sku', label: 'SKU', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'name', label: 'Name', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'productType', label: 'Type', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'costPricePaise', label: 'Cost Price', type: 'number', filterable: true, sortable: true, aggregatable: true },
      { name: 'sellingPricePaise', label: 'Selling Price', type: 'number', filterable: true, sortable: true, aggregatable: true },
    ],
  },
  {
    name: 'customers',
    label: 'Customers',
    fields: [
      { name: 'firstName', label: 'First Name', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'lastName', label: 'Last Name', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'customerType', label: 'Type', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'loyaltyPoints', label: 'Loyalty Points', type: 'number', filterable: true, sortable: true, aggregatable: true },
      { name: 'city', label: 'City', type: 'string', filterable: true, sortable: true, aggregatable: false },
    ],
  },
  {
    name: 'job_orders',
    label: 'Job Orders',
    fields: [
      { name: 'jobNumber', label: 'Job Number', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'status', label: 'Status', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'priority', label: 'Priority', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'quantity', label: 'Quantity', type: 'number', filterable: true, sortable: true, aggregatable: true },
    ],
  },
  {
    name: 'invoices',
    label: 'Invoices',
    fields: [
      { name: 'invoiceNumber', label: 'Invoice Number', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'status', label: 'Status', type: 'string', filterable: true, sortable: true, aggregatable: false },
      { name: 'totalPaise', label: 'Total', type: 'number', filterable: true, sortable: true, aggregatable: true },
      { name: 'taxPaise', label: 'Tax', type: 'number', filterable: true, sortable: true, aggregatable: true },
    ],
  },
];

export default function CustomReportPage() {
  const [result, setResult] = React.useState<CustomReportResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleExecute = async (config: {
    entityType: string;
    columns: string[];
    filters: unknown[];
    groupBy: string[];
    aggregations: unknown[];
  }) => {
    setLoading(true);
    // In production, call tRPC executeCustomReport
    // Simulate with a timeout
    await new Promise((resolve) => setTimeout(resolve, 500));

    setResult({
      headers: config.columns.map((c) => ({ key: c, label: c, type: 'string' })),
      rows: [
        { [config.columns[0] ?? 'id']: 'Sample row 1' },
        { [config.columns[0] ?? 'id']: 'Sample row 2' },
      ],
      totals: {},
      rowCount: 2,
      executionTimeMs: 45,
    });
    setLoading(false);
  };

  const handleSave = (config: unknown) => {
    console.log('Saving report config:', config);
  };

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    console.log(`Exporting custom report as ${format}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Report Builder"
        description="Build custom reports from any data source with flexible filters and aggregations."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Custom' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Builder Panel */}
        <div className="lg:col-span-2 rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Report Configuration</h3>
          <CustomReportBuilder
            entities={MOCK_ENTITIES}
            onExecute={handleExecute}
            onSave={handleSave}
            loading={loading}
          />
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {result.rowCount} rows returned in {result.executionTimeMs}ms
                </p>
                <ExportButton onExport={handleExport} />
              </div>
              <ReportTable
                columns={result.headers.map((h) => ({
                  key: h.key,
                  label: h.label,
                }))}
                data={result.rows as Array<Record<string, unknown>>}
                totals={result.totals}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-lg border bg-card text-muted-foreground">
              Configure and run a report to see results here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
