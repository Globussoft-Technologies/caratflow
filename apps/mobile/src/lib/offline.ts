// ─── Offline Support ────────────────────────────────────────────
// Queue mutations when offline, sync when back online.
// Sales staff can create sales offline, which queue for sync.

import { storeData, getData, removeData } from './storage';
import { apiRequest } from './api';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineMutation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: unknown;
  createdAt: string;
  retryCount: number;
}

const QUEUE_KEY = 'offline_mutation_queue';
const MAX_RETRIES = 3;

export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true;
  } catch {
    return true; // Assume online if we can't check
  }
}

export async function getQueue(): Promise<OfflineMutation[]> {
  return (await getData<OfflineMutation[]>(QUEUE_KEY)) ?? [];
}

export async function enqueue(
  mutation: Omit<OfflineMutation, 'id' | 'createdAt' | 'retryCount'>,
): Promise<void> {
  const queue = await getQueue();
  const entry: OfflineMutation = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  queue.push(entry);
  await storeData(QUEUE_KEY, queue);
}

export async function syncQueue(): Promise<{
  synced: number;
  failed: number;
}> {
  const online = await isOnline();
  if (!online) return { synced: 0, failed: 0 };

  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: OfflineMutation[] = [];

  for (const mutation of queue) {
    try {
      const result = await apiRequest(mutation.endpoint, {
        method: mutation.method,
        body: mutation.body,
      });

      if (result.success) {
        synced++;
      } else {
        mutation.retryCount++;
        if (mutation.retryCount < MAX_RETRIES) {
          remaining.push(mutation);
        }
        failed++;
      }
    } catch {
      mutation.retryCount++;
      if (mutation.retryCount < MAX_RETRIES) {
        remaining.push(mutation);
      }
      failed++;
    }
  }

  await storeData(QUEUE_KEY, remaining);
  return { synced, failed };
}

export async function clearQueue(): Promise<void> {
  await removeData(QUEUE_KEY);
}

export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
