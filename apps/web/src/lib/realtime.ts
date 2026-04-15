// ─── Realtime Client ───────────────────────────────────────────
// Thin socket.io-client wrapper that lazily creates a single shared
// connection to the API `/realtime` namespace on first `useRealtime`
// call. JWT is read from `localStorage.accessToken` and passed via
// the handshake auth payload. Reconnection is handled by socket.io.

'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';

interface DomainEventPayload {
  type: string;
  tenantId: string;
  userId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

let sharedSocket: Socket | null = null;

function getApiBaseUrl(): string {
  // Prefer the explicit env var, then fall back to same-origin.
  const fromEnv =
    (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_API_URL as string | undefined)) ||
    undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function getSocket(): Socket {
  if (sharedSocket) return sharedSocket;

  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') ?? '' : '';

  sharedSocket = io(`${getApiBaseUrl()}/realtime`, {
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return sharedSocket;
}

/**
 * Subscribe to a broadcastable domain event type for the current tenant.
 * The handler is invoked with the event payload whenever the server emits
 * a matching event. Cleans up on unmount.
 */
export function useRealtime(
  eventType: string,
  handler: (payload: Record<string, unknown>) => void,
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const socket = getSocket();

    const listener = (evt: DomainEventPayload) => {
      if (evt?.type === eventType) {
        handler(evt.payload);
      }
    };

    socket.on('domain-event', listener);
    return () => {
      socket.off('domain-event', listener);
    };
  }, [eventType, handler]);
}

/** Force-disconnect the shared socket (used by tests and on logout). */
export function disconnectRealtime(): void {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
}
