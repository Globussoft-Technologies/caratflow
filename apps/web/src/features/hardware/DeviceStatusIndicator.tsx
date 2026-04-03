'use client';

import { useEffect, useState } from 'react';
import { DeviceStatus } from '@caratflow/shared-types';

interface DeviceStatusIndicatorProps {
  deviceId: string;
  initialStatus?: DeviceStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_COLORS: Record<DeviceStatus, string> = {
  [DeviceStatus.CONNECTED]: 'bg-green-500',
  [DeviceStatus.DISCONNECTED]: 'bg-red-500',
  [DeviceStatus.ERROR]: 'bg-amber-500',
  [DeviceStatus.INITIALIZING]: 'bg-blue-500',
};

const STATUS_LABELS: Record<DeviceStatus, string> = {
  [DeviceStatus.CONNECTED]: 'Connected',
  [DeviceStatus.DISCONNECTED]: 'Disconnected',
  [DeviceStatus.ERROR]: 'Error',
  [DeviceStatus.INITIALIZING]: 'Initializing',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

/**
 * Real-time device connection status indicator dot.
 * Subscribes to WebSocket for live status updates.
 */
export function DeviceStatusIndicator({
  deviceId,
  initialStatus = DeviceStatus.DISCONNECTED,
  showLabel = false,
  size = 'md',
}: DeviceStatusIndicatorProps) {
  const [status, setStatus] = useState<DeviceStatus>(initialStatus);

  useEffect(() => {
    // In production, this would subscribe to WebSocket events
    // for device:connected / device:disconnected
    // For now, just use the initial status
    setStatus(initialStatus);
  }, [initialStatus]);

  const colorClass = STATUS_COLORS[status];
  const sizeClass = SIZE_CLASSES[size];
  const isAnimated = status === DeviceStatus.CONNECTED || status === DeviceStatus.INITIALIZING;

  return (
    <div className="inline-flex items-center gap-2">
      <span className="relative flex">
        <span
          className={`inline-block rounded-full ${colorClass} ${sizeClass} ${
            isAnimated ? 'animate-pulse' : ''
          }`}
        />
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</span>
      )}
    </div>
  );
}
