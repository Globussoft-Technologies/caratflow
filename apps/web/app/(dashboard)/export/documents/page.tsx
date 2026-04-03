'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, FileText } from 'lucide-react';
import { useState } from 'react';

const DOC_TYPES = ['ALL', 'PACKING_LIST', 'SHIPPING_BILL', 'BILL_OF_LADING', 'AIRWAY_BILL', 'CERTIFICATE_OF_ORIGIN', 'ARE1', 'GR_FORM', 'INSURANCE_CERTIFICATE'] as const;

const documents = [
  { id: '1', documentType: 'PACKING_LIST', documentNumber: 'PL-2604-008', orderNumber: 'EXP/CF/2604/0008', status: 'VERIFIED', issuedDate: '2026-04-03' },
  { id: '2', documentType: 'SHIPPING_BILL', documentNumber: 'SB-2604-008', orderNumber: 'EXP/CF/2604/0008', status: 'VERIFIED', issuedDate: '2026-04-03' },
  { id: '3', documentType: 'BILL_OF_LADING', documentNumber: 'BL-MAEU-2604', orderNumber: 'EXP/CF/2604/0008', status: 'ISSUED', issuedDate: '2026-04-04' },
  { id: '4', documentType: 'CERTIFICATE_OF_ORIGIN', documentNumber: 'COO-2604-008', orderNumber: 'EXP/CF/2604/0008', status: 'ISSUED', issuedDate: '2026-04-03' },
  { id: '5', documentType: 'PACKING_LIST', documentNumber: 'PL-2604-007', orderNumber: 'EXP/CF/2604/0007', status: 'DRAFT', issuedDate: null },
  { id: '6', documentType: 'GR_FORM', documentNumber: 'GR-2604-005', orderNumber: 'EXP/CF/2604/0006', status: 'SUBMITTED', issuedDate: '2026-04-02' },
];

export default function ShippingDocumentsPage() {
  const [filter, setFilter] = useState<string>('ALL');

  const filtered = filter === 'ALL' ? documents : documents.filter((d) => d.documentType === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipping Documents"
        description="Packing lists, shipping bills, certificates of origin, ARE forms, and more."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Documents' },
        ]}
        actions={
          <a href="/export/documents/generate" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Generate Document
          </a>
        }
      />

      <div className="flex items-center gap-2 overflow-x-auto">
        {DOC_TYPES.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filter === t ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doc) => (
          <div key={doc.id} className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{doc.documentType.replace(/_/g, ' ')}</p>
                  <p className="text-xs font-mono text-muted-foreground">{doc.documentNumber ?? 'No number'}</p>
                </div>
              </div>
              <StatusBadge label={doc.status} variant={getStatusVariant(doc.status)} dot={false} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Order: {doc.orderNumber}</span>
              <span>{doc.issuedDate ? new Date(doc.issuedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Not issued'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
