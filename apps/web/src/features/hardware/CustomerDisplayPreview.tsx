'use client';

import { useState, useEffect } from 'react';
import type { CustomerDisplayMessage } from '@caratflow/shared-types';

interface CustomerDisplayPreviewProps {
  deviceId: string;
  locationId: string;
  initialMessage?: CustomerDisplayMessage;
}

/**
 * Preview of what the customer-facing display shows.
 * Styled to look like a 2-line VFD/LCD customer display.
 */
export function CustomerDisplayPreview({
  deviceId,
  locationId,
  initialMessage,
}: CustomerDisplayPreviewProps) {
  const [message, setMessage] = useState<CustomerDisplayMessage | null>(initialMessage ?? null);

  useEffect(() => {
    // In production, subscribe to WebSocket display:update events
    // socket.emit('subscribe:device', { deviceType: 'display', locationId });
    // socket.on('display:update', (msg) => setMessage(msg));
  }, [locationId, deviceId]);

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b p-3">
        <h3 className="text-xs font-semibold text-muted-foreground">Customer Display Preview</h3>
      </div>
      <div className="p-4">
        <div className="mx-auto max-w-xs rounded-lg bg-gray-900 p-4 shadow-inner">
          <div className="space-y-1 font-mono">
            <div className="h-6 truncate text-lg leading-6 text-green-400">
              {message?.line1 || '\u00A0'}
            </div>
            <div className="h-6 truncate text-lg leading-6 text-green-400">
              {message?.line2 || '\u00A0'}
            </div>
          </div>
        </div>
        {message?.amount !== undefined && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Amount: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(message.amount / 100)}
          </p>
        )}
      </div>
    </div>
  );
}
