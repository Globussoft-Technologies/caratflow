'use client';

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import type { RfidStockTakeResult, RfidTagData } from '@caratflow/shared-types';

interface RfidStockTakeWizardProps {
  onComplete?: (result: RfidStockTakeResult) => void;
  onCancel?: () => void;
}

type WizardStep = 'select-location' | 'scanning' | 'results';

/**
 * Multi-step wizard for RFID-based stock counting.
 * Step 1: Select location
 * Step 2: Scan tags (real-time feed)
 * Step 3: View results (matched/unmatched/missing)
 */
export function RfidStockTakeWizard({
  onComplete,
  onCancel,
}: RfidStockTakeWizardProps) {
  const [step, setStep] = useState<WizardStep>('select-location');
  const [locationId, setLocationId] = useState('');
  const [scannedTags, setScannedTags] = useState<RfidTagData[]>([]);
  const [result, setResult] = useState<RfidStockTakeResult | null>(null);

  const stockTakeMutation = trpc.hardware.rfid.stockTake.useMutation({
    onSuccess: (data: RfidStockTakeResult) => {
      setResult(data);
      setStep('results');
      onComplete?.(data);
    },
  });

  const handleStartScan = () => {
    if (!locationId) return;
    setStep('scanning');
    setScannedTags([]);
    // In production, subscribe to WebSocket rfid:scan events for this location
    // and accumulate tags in scannedTags state
  };

  const handleAddTag = useCallback((tag: RfidTagData) => {
    setScannedTags((prev) => {
      // Deduplicate by EPC
      if (prev.some((t) => t.epc === tag.epc)) return prev;
      return [...prev, tag];
    });
  }, []);

  const handleFinishScan = () => {
    stockTakeMutation.mutate({
      locationId,
      scannedTags,
    });
  };

  const handleReset = () => {
    setStep('select-location');
    setLocationId('');
    setScannedTags([]);
    setResult(null);
  };

  // Simulate adding a tag for testing (would be removed in production)
  const handleSimulateTag = () => {
    const tag: RfidTagData = {
      tagId: `TAG-${Date.now()}`,
      epc: `EPC${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      rssi: -40 - Math.floor(Math.random() * 30),
      timestamp: new Date().toISOString(),
    };
    handleAddTag(tag);
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['select-location', 'scanning', 'results'] as WizardStep[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : idx < ['select-location', 'scanning', 'results'].indexOf(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {idx + 1}
            </span>
            <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
              {s === 'select-location' ? 'Select Location' : s === 'scanning' ? 'Scan Tags' : 'Results'}
            </span>
            {idx < 2 && <span className="mx-2 text-muted-foreground">-</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Select Location */}
      {step === 'select-location' && (
        <div className="rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-semibold">Select Location for Stock Take</h3>
          <div className="max-w-md">
            <label className="block text-sm font-medium" htmlFor="st-location">Location ID</label>
            <input
              id="st-location"
              type="text"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="UUID of the location"
            />
          </div>
          <div className="mt-6 flex gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleStartScan}
              disabled={!locationId}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Start Scanning
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Scanning */}
      {step === 'scanning' && (
        <div className="rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Scanning RFID Tags</h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                Listening
              </span>
              <span className="text-sm font-medium">{scannedTags.length} tags</span>
            </div>
          </div>

          {/* Scanned Tags List */}
          <div className="mb-4 max-h-64 overflow-y-auto rounded-md border">
            {scannedTags.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Move RFID reader near tagged items...
              </div>
            ) : (
              <div className="divide-y">
                {scannedTags.map((tag, idx) => (
                  <div key={tag.epc} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-mono text-xs">{tag.epc}</span>
                    <span className="text-xs text-muted-foreground">
                      RSSI: {tag.rssi ?? 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSimulateTag}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Simulate Tag (Test)
            </button>
            <button
              onClick={handleFinishScan}
              disabled={scannedTags.length === 0 || stockTakeMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {stockTakeMutation.isPending ? 'Processing...' : 'Complete Scan'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && result && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold">{result.totalScanned}</p>
              <p className="text-xs text-muted-foreground">Total Scanned</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{result.matched.length}</p>
              <p className="text-xs text-green-600">Matched</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{result.unmatched.length}</p>
              <p className="text-xs text-amber-600">Unmatched</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{result.missing.length}</p>
              <p className="text-xs text-red-600">Missing</p>
            </div>
          </div>

          {/* Matched Items */}
          {result.matched.length > 0 && (
            <div className="rounded-lg border">
              <div className="border-b p-3">
                <h4 className="text-sm font-semibold text-green-700">Matched Items</h4>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs">
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-left">Serial</th>
                      <th className="px-3 py-2 text-left">Tag EPC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.matched.map((item) => (
                      <tr key={item.epc}>
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.productSku}</td>
                        <td className="px-3 py-2 font-mono text-xs">{item.serialNumber}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.epc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Missing Items */}
          {result.missing.length > 0 && (
            <div className="rounded-lg border border-red-200">
              <div className="border-b border-red-200 bg-red-50 p-3">
                <h4 className="text-sm font-semibold text-red-700">Missing Items (Expected but not scanned)</h4>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs">
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-left">Serial</th>
                      <th className="px-3 py-2 text-left">RFID Tag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.missing.map((item) => (
                      <tr key={item.rfidTag}>
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.productSku}</td>
                        <td className="px-3 py-2 font-mono text-xs">{item.serialNumber}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.rfidTag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unmatched Tags */}
          {result.unmatched.length > 0 && (
            <div className="rounded-lg border border-amber-200">
              <div className="border-b border-amber-200 bg-amber-50 p-3">
                <h4 className="text-sm font-semibold text-amber-700">Unmatched Tags (Scanned but not in system)</h4>
              </div>
              <div className="max-h-32 overflow-y-auto divide-y">
                {result.unmatched.map((tag) => (
                  <div key={tag.epc} className="px-3 py-2 font-mono text-xs">
                    {tag.epc}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleReset}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              New Stock Take
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
