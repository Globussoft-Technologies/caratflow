'use client';

import * as React from 'react';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  onExport: (format: 'csv' | 'pdf' | 'xlsx') => void;
  formats?: Array<'csv' | 'pdf' | 'xlsx'>;
  disabled?: boolean;
}

export function ExportButton({
  onExport,
  formats = ['csv', 'xlsx', 'pdf'],
  disabled = false,
}: ExportButtonProps) {
  const [open, setOpen] = React.useState(false);

  const formatLabels: Record<string, string> = {
    csv: 'CSV',
    xlsx: 'Excel (XLSX)',
    pdf: 'PDF',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="h-4 w-4" />
        Export
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-md py-1 min-w-[160px]">
            {formats.map((format) => (
              <button
                key={format}
                onClick={() => {
                  onExport(format);
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-accent"
              >
                <Download className="inline h-3.5 w-3.5 mr-2" />
                {formatLabels[format]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
