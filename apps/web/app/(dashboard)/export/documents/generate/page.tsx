'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';

type DocType = 'PACKING_LIST' | 'CERTIFICATE_OF_ORIGIN' | 'SHIPPING_BILL';

export default function GenerateDocumentsPage() {
  const [docType, setDocType] = useState<DocType>('PACKING_LIST');
  const [exportOrderId, setExportOrderId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [triggered, setTriggered] = useState(false);

  const ordersQuery = trpc.export.listOrders.useQuery({
    pagination: { page: 1, limit: 100, sortOrder: 'desc' },
  });
  const invoicesQuery = trpc.export.listInvoices.useQuery({
    pagination: { page: 1, limit: 100, sortOrder: 'desc' },
  });

  const orders = ((ordersQuery.data as { data?: Array<{ id: string; orderNumber?: string }> } | undefined)?.data) ?? [];
  const invoices = ((invoicesQuery.data as { data?: Array<{ id: string; invoiceNumber?: string }> } | undefined)?.data) ?? [];

  const packingListQuery = trpc.export.generatePackingList.useQuery(
    { exportOrderId },
    { enabled: triggered && docType === 'PACKING_LIST' && !!exportOrderId },
  );
  const cooQuery = trpc.export.generateCertificateOfOrigin.useQuery(
    { exportOrderId },
    { enabled: triggered && docType === 'CERTIFICATE_OF_ORIGIN' && !!exportOrderId },
  );
  const shippingBillQuery = trpc.export.generateShippingBillData.useQuery(
    { invoiceId },
    { enabled: triggered && docType === 'SHIPPING_BILL' && !!invoiceId },
  );

  const activeQuery =
    docType === 'PACKING_LIST'
      ? packingListQuery
      : docType === 'CERTIFICATE_OF_ORIGIN'
        ? cooQuery
        : shippingBillQuery;

  const canGenerate = docType === 'SHIPPING_BILL' ? !!invoiceId : !!exportOrderId;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setTriggered(true);
    activeQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Shipping Documents"
        description="Produce packing lists, certificates of origin, and shipping bill data from an export order or invoice."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Documents', href: '/export/documents' },
          { label: 'Generate' },
        ]}
      />

      <form onSubmit={handleGenerate} className="max-w-2xl space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Document Type</label>
          <select
            value={docType}
            onChange={(e) => {
              setDocType(e.target.value as DocType);
              setTriggered(false);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="PACKING_LIST">Packing List</option>
            <option value="CERTIFICATE_OF_ORIGIN">Certificate of Origin</option>
            <option value="SHIPPING_BILL">Shipping Bill Data</option>
          </select>
        </div>

        {docType !== 'SHIPPING_BILL' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Order *</label>
            <select
              value={exportOrderId}
              onChange={(e) => setExportOrderId(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select order...</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber ?? o.id}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Invoice *</label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select invoice...</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber ?? i.id}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={!canGenerate || activeQuery.isFetching}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {activeQuery.isFetching ? 'Generating...' : 'Generate Document'}
        </button>
      </form>

      {triggered && activeQuery.isError && (
        <div className="max-w-2xl rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {activeQuery.error?.message}
        </div>
      )}

      {triggered && activeQuery.data != null && (
        <div className="max-w-3xl space-y-2">
          <h3 className="text-sm font-semibold">Generated Document</h3>
          <pre className="rounded-md border bg-muted p-4 text-xs overflow-auto max-h-[60vh]">
            {JSON.stringify(activeQuery.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
