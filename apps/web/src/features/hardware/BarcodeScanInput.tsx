'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import type { BarcodeProductLookup } from '@caratflow/shared-types';

interface BarcodeScanInputProps {
  onProductFound?: (lookup: BarcodeProductLookup) => void;
  onNotFound?: (barcode: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Threshold in ms to detect rapid keystrokes from scanner (keyboard wedge mode) */
  scanThresholdMs?: number;
}

/**
 * Input field that captures barcode scanner output (keyboard wedge mode).
 * Detects rapid keystroke sequences typical of barcode scanners and auto-looks up the product.
 */
export function BarcodeScanInput({
  onProductFound,
  onNotFound,
  placeholder = 'Scan barcode or type SKU...',
  autoFocus = true,
  scanThresholdMs = 50,
}: BarcodeScanInputProps) {
  const [barcode, setBarcode] = useState('');
  const [lastLookup, setLastLookup] = useState<BarcodeProductLookup | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const keystrokeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferRef = useRef('');
  const lastKeystrokeRef = useRef(0);

  const lookupMutation = trpc.hardware.barcode.lookup.useMutation({
    onSuccess: (data: BarcodeProductLookup) => {
      setLastLookup(data);
      setIsLooking(false);
      if (data.product) {
        onProductFound?.(data);
      } else {
        onNotFound?.(data.barcode);
      }
    },
    onError: () => {
      setIsLooking(false);
    },
  });

  const performLookup = useCallback(
    (code: string) => {
      if (!code.trim()) return;
      setIsLooking(true);
      setLastLookup(null);
      lookupMutation.mutate({ barcode: code.trim() });
    },
    [lookupMutation],
  );

  /**
   * Handle key events to detect barcode scanner input.
   * Scanners send characters rapidly followed by Enter.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now();

      if (e.key === 'Enter') {
        e.preventDefault();
        const code = bufferRef.current || barcode;
        if (code.trim()) {
          performLookup(code.trim());
        }
        bufferRef.current = '';
        setBarcode('');
        return;
      }

      // Detect rapid keystrokes (scanner behavior)
      const elapsed = now - lastKeystrokeRef.current;
      lastKeystrokeRef.current = now;

      if (elapsed < scanThresholdMs && e.key.length === 1) {
        bufferRef.current += e.key;

        // Clear previous timer
        if (keystrokeTimerRef.current) {
          clearTimeout(keystrokeTimerRef.current);
        }

        // Set a timer to auto-submit if keystrokes stop
        keystrokeTimerRef.current = setTimeout(() => {
          if (bufferRef.current.length >= 3) {
            performLookup(bufferRef.current);
            setBarcode('');
            bufferRef.current = '';
          }
        }, 200);
      }
    },
    [barcode, performLookup, scanThresholdMs],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcode(e.target.value);
  };

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (keystrokeTimerRef.current) {
        clearTimeout(keystrokeTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-input bg-transparent px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {isLooking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
      </div>

      {/* Quick result display */}
      {lastLookup && (
        <div
          className={`rounded-md border p-3 text-sm ${
            lastLookup.product
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {lastLookup.product ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{lastLookup.product.name}</span>
                <span className="ml-2 text-xs">SKU: {lastLookup.product.sku}</span>
              </div>
              {lastLookup.product.sellingPricePaise !== null && (
                <span className="font-semibold">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0,
                  }).format(lastLookup.product.sellingPricePaise / 100)}
                </span>
              )}
            </div>
          ) : (
            <span>No product found for barcode: {lastLookup.barcode}</span>
          )}
        </div>
      )}
    </div>
  );
}
