'use client';

import { useState } from 'react';
import { FileText, Download } from 'lucide-react';

const DOC_TYPES = [
  { value: 'PACKING_LIST', label: 'Packing List', description: 'Auto-generated from order items' },
  { value: 'SHIPPING_BILL', label: 'Shipping Bill', description: 'Required for customs clearance' },
  { value: 'BILL_OF_LADING', label: 'Bill of Lading', description: 'Transport document for sea shipment' },
  { value: 'AIRWAY_BILL', label: 'Airway Bill', description: 'Transport document for air shipment' },
  { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin', description: 'Certifies country of manufacture' },
  { value: 'ARE1', label: 'ARE-1 Form', description: 'Application for removal of excisable goods for export' },
  { value: 'ARE3', label: 'ARE-3 Form', description: 'For export by post or courier' },
  { value: 'GR_FORM', label: 'GR Form', description: 'Exchange control form for exporters' },
  { value: 'INSURANCE_CERTIFICATE', label: 'Insurance Certificate', description: 'Marine/cargo insurance document' },
] as const;

export function DocumentGenerator() {
  const [selectedOrder, setSelectedOrder] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    // In production, this calls tRPC mutation
    setGenerated(true);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Export Order *</label>
            <select value={selectedOrder} onChange={(e) => { setSelectedOrder(e.target.value); setGenerated(false); }} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Select order...</option>
              <option value="o1">EXP/CF/2604/0008 - Diamond Corp USA</option>
              <option value="o2">EXP/CF/2604/0007 - Al Maktoum Jewels</option>
              <option value="o3">EXP/CF/2604/0006 - London Gold Ltd</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Document Number</label>
            <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Auto-generated if empty" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Document Type *</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DOC_TYPES.map((doc) => (
              <button
                key={doc.value}
                onClick={() => { setSelectedDocType(doc.value); setGenerated(false); }}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selectedDocType === doc.value ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                }`}
              >
                <FileText className={`h-5 w-5 mt-0.5 ${selectedDocType === doc.value ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">{doc.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleGenerate}
            disabled={!selectedOrder || !selectedDocType}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <FileText className="h-4 w-4" /> Generate Document
          </button>
        </div>
      </div>

      {generated && (
        <div className="rounded-lg border bg-green-50 border-green-200 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm font-bold">{'\u2713'}</div>
            <div>
              <p className="text-sm font-semibold text-green-800">Document Generated Successfully</p>
              <p className="text-xs text-green-600">{DOC_TYPES.find((d) => d.value === selectedDocType)?.label} for order {selectedOrder}</p>
            </div>
          </div>
          <button className="inline-flex h-9 items-center gap-2 rounded-md border border-green-300 bg-white px-4 text-sm font-medium text-green-700 hover:bg-green-50">
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      )}
    </div>
  );
}
