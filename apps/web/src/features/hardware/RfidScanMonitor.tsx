'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RfidTagLookupResponse } from '@caratflow/shared-types';

interface RfidScanMonitorProps {
  locationId: string;
  onTagScanned?: (tag: RfidTagLookupResponse) => void;
  maxVisible?: number;
}

interface ScannedTagEntry {
  tag: RfidTagLookupResponse;
  scannedAt: Date;
}

/**
 * Live RFID scan feed. Shows tags as they are scanned with product match status.
 * Subscribes to WebSocket for real-time updates.
 */
export function RfidScanMonitor({
  locationId,
  onTagScanned,
  maxVisible = 20,
}: RfidScanMonitorProps) {
  const [scannedTags, setScannedTags] = useState<ScannedTagEntry[]>([]);
  const [isListening, setIsListening] = useState(false);

  const addTag = useCallback(
    (tag: RfidTagLookupResponse) => {
      setScannedTags((prev) => {
        const updated = [{ tag, scannedAt: new Date() }, ...prev];
        return updated.slice(0, maxVisible);
      });
      onTagScanned?.(tag);
    },
    [maxVisible, onTagScanned],
  );

  useEffect(() => {
    // In production, subscribe to WebSocket rfid:scan events for this location
    // socket.emit('subscribe:device', { deviceType: 'rfid', locationId });
    // socket.on('rfid:scan', (data) => { data.lookupResults.forEach(addTag); });
    setIsListening(true);

    return () => {
      setIsListening(false);
    };
  }, [locationId, addTag]);

  const clearScans = () => setScannedTags([]);

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">RFID Scan Monitor</h3>
          {isListening && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Listening
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{scannedTags.length} tags</span>
          <button
            onClick={clearScans}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {scannedTags.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Waiting for RFID scans...
          </div>
        ) : (
          <div className="divide-y">
            {scannedTags.map((entry, idx) => (
              <div key={`${entry.tag.epc}-${idx}`} className="flex items-center gap-3 p-3">
                <span
                  className={`h-2 w-2 rounded-full ${
                    entry.tag.serialNumber ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  {entry.tag.productName ? (
                    <>
                      <p className="truncate text-sm font-medium">{entry.tag.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {entry.tag.productSku} | SN: {entry.tag.serialNumber}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-amber-600">Unknown Tag</p>
                      <p className="truncate text-xs text-muted-foreground">EPC: {entry.tag.epc}</p>
                    </>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {entry.scannedAt.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
