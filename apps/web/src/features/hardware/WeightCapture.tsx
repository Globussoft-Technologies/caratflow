'use client';

import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import type { WeightReading, WeightCaptureResponse } from '@caratflow/shared-types';

interface WeightCaptureProps {
  deviceId: string;
  locationId: string;
  onWeightCaptured?: (capture: WeightCaptureResponse) => void;
}

/**
 * Real-time weight display from scale via WebSocket.
 * Shows stable indicator, tare button, and capture button.
 */
export function WeightCapture({
  deviceId,
  locationId,
  onWeightCaptured,
}: WeightCaptureProps) {
  const [currentReading, setCurrentReading] = useState<WeightReading | null>(null);
  const [tareWeightMg, setTareWeightMg] = useState(0);
  const [capturedWeight, setCapturedWeight] = useState<WeightCaptureResponse | null>(null);

  const captureMutation = trpc.hardware.scale.captureWeight.useMutation({
    onSuccess: (data: WeightCaptureResponse) => {
      setCapturedWeight(data);
      onWeightCaptured?.(data);
    },
  });

  const tareMutation = trpc.hardware.scale.tare.useMutation({
    onSuccess: (data: { tareWeightMg: number }) => {
      setTareWeightMg(data.tareWeightMg);
    },
  });

  const clearTareMutation = trpc.hardware.scale.clearTare.useMutation({
    onSuccess: () => {
      setTareWeightMg(0);
    },
  });

  useEffect(() => {
    // In production, subscribe to WebSocket scale:reading events
    // socket.emit('subscribe:device', { deviceType: 'scale', locationId });
    // socket.on('scale:reading', (reading) => setCurrentReading(reading));
  }, [locationId, deviceId]);

  const handleTare = useCallback(() => {
    if (currentReading) {
      tareMutation.mutate({
        deviceId,
        tareWeightMg: currentReading.weightMg,
      });
    }
  }, [currentReading, deviceId, tareMutation]);

  const handleClearTare = useCallback(() => {
    clearTareMutation.mutate({ deviceId });
  }, [deviceId, clearTareMutation]);

  const handleCapture = useCallback(() => {
    captureMutation.mutate({
      deviceId,
      tareWeightMg,
    });
  }, [deviceId, tareWeightMg, captureMutation]);

  const formatWeight = (mg: number): string => {
    if (mg >= 1000) {
      return `${(mg / 1000).toFixed(3)} g`;
    }
    return `${mg} mg`;
  };

  const displayWeightMg = currentReading
    ? Math.max(0, currentReading.weightMg - tareWeightMg)
    : 0;

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b p-4">
        <h3 className="text-sm font-semibold">Weighing Scale</h3>
      </div>

      <div className="p-6">
        {/* Main Weight Display */}
        <div className="mb-6 text-center">
          <div className="font-mono text-4xl font-bold tracking-wide">
            {currentReading ? formatWeight(displayWeightMg) : '---'}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            {currentReading?.isStable ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Stable
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Stabilizing
              </span>
            )}
            {tareWeightMg > 0 && (
              <span className="text-xs text-muted-foreground">
                Tare: {formatWeight(tareWeightMg)}
              </span>
            )}
          </div>
        </div>

        {/* Gross / Tare / Net breakdown */}
        {currentReading && tareWeightMg > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-2 rounded-md border p-3 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Gross</p>
              <p className="font-medium">{formatWeight(currentReading.weightMg)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tare</p>
              <p className="font-medium">{formatWeight(tareWeightMg)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Net</p>
              <p className="font-semibold">{formatWeight(displayWeightMg)}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleTare}
            disabled={!currentReading}
            className="flex-1 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Tare
          </button>
          {tareWeightMg > 0 && (
            <button
              onClick={handleClearTare}
              className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Clear Tare
            </button>
          )}
          <button
            onClick={handleCapture}
            disabled={!currentReading?.isStable || captureMutation.isPending}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {captureMutation.isPending ? 'Capturing...' : 'Capture'}
          </button>
        </div>

        {/* Captured Weight Result */}
        {capturedWeight && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <p className="font-medium">Weight Captured</p>
            <p>Net: {formatWeight(capturedWeight.netWeightMg)} | Gross: {formatWeight(capturedWeight.grossWeightMg)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
