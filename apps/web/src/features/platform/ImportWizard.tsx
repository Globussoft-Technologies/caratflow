'use client';

import { useState } from 'react';
import { Upload, ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { ColumnMapper } from './ColumnMapper';

interface ImportWizardProps {
  onClose: () => void;
}

type WizardStep = 'upload' | 'mapping' | 'preview' | 'processing' | 'results';

interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  fileName: string;
}

const ENTITY_TYPES = [
  { value: 'customer', label: 'Customers' },
  { value: 'product', label: 'Products' },
  { value: 'supplier', label: 'Suppliers' },
] as const;

/**
 * ImportWizard: Multi-step import wizard for CSV/Excel data.
 * Steps: Upload -> Map Columns -> Preview -> Process -> Results
 */
export function ImportWizard({ onClose }: ImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [entityType, setEntityType] = useState<string>('customer');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    successRows: number;
    errorRows: number;
    errors: Array<{ row: number; field: string; error: string }>;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] ?? '';
        });
        return row;
      });

      setParsedFile({ headers, rows, fileName: file.name });
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const handleProcess = async () => {
    if (!parsedFile) return;
    setIsProcessing(true);
    setStep('processing');

    try {
      // TODO: Call trpc.platform.import.create.mutate then trpc.platform.import.process.mutate
      console.log('Processing import:', entityType, columnMapping, parsedFile.rows.length);

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setResults({
        successRows: parsedFile.rows.length,
        errorRows: 0,
        errors: [],
      });
      setStep('results');
    } catch {
      setResults({
        successRows: 0,
        errorRows: parsedFile.rows.length,
        errors: [{ row: 0, field: '_general', error: 'Import failed' }],
      });
      setStep('results');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {(['upload', 'mapping', 'preview', 'results'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-border" />}
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                step === s || (['upload', 'mapping', 'preview', 'processing', 'results'].indexOf(step) > ['upload', 'mapping', 'preview', 'results'].indexOf(s))
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span className="hidden text-sm sm:inline">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Step 1: Upload File</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium" htmlFor="import-entity-type">Entity Type</label>
            <select
              id="import-entity-type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm md:w-1/3"
            >
              {ENTITY_TYPES.map((et) => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12">
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-sm font-medium">Upload a CSV file</p>
            <p className="mb-4 text-xs text-muted-foreground">First row should contain column headers</p>
            <label className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Choose File
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Step: Column Mapping */}
      {step === 'mapping' && parsedFile && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Step 2: Map Columns</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            File: <strong>{parsedFile.fileName}</strong> ({parsedFile.rows.length} rows, {parsedFile.headers.length} columns)
          </p>
          <ColumnMapper
            sourceHeaders={parsedFile.headers}
            entityType={entityType}
            mapping={columnMapping}
            onMappingChange={setColumnMapping}
          />
          <div className="mt-4 flex justify-between">
            <button onClick={() => setStep('upload')} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button onClick={() => setStep('preview')} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Preview
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && parsedFile && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Step 3: Preview & Import</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Ready to import {parsedFile.rows.length} {entityType} records.
          </p>
          <div className="max-h-64 overflow-auto rounded border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  {Object.values(columnMapping).filter(Boolean).slice(0, 5).map((field) => (
                    <th key={field} className="px-3 py-2 text-left font-medium">{field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedFile.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    {Object.entries(columnMapping)
                      .filter(([, v]) => v)
                      .slice(0, 5)
                      .map(([csvCol]) => (
                        <td key={csvCol} className="px-3 py-2">{String(row[csvCol] ?? '')}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedFile.rows.length > 10 && (
            <p className="mt-2 text-xs text-muted-foreground">Showing first 10 of {parsedFile.rows.length} rows.</p>
          )}
          <div className="mt-4 flex justify-between">
            <button onClick={() => setStep('mapping')} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button onClick={handleProcess} className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Start Import
            </button>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-medium">Processing import...</p>
          <p className="text-sm text-muted-foreground">This may take a few minutes for large files.</p>
        </div>
      )}

      {/* Step: Results */}
      {step === 'results' && results && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            {results.errorRows === 0 ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            )}
            <div>
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <p className="text-sm text-muted-foreground">
                {results.successRows} succeeded, {results.errorRows} failed
              </p>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium">Errors</h4>
              <div className="max-h-48 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Row</th>
                      <th className="px-3 py-2 text-left font-medium">Field</th>
                      <th className="px-3 py-2 text-left font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.errors.map((err, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{err.row}</td>
                        <td className="px-3 py-2">{err.field}</td>
                        <td className="px-3 py-2 text-red-600">{err.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Close button (always visible) */}
      {step !== 'processing' && (
        <div className="flex justify-start">
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            Cancel and return to import history
          </button>
        </div>
      )}
    </div>
  );
}
