import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock storage and api before importing offline
vi.mock('../storage', () => ({
  storeData: vi.fn(),
  getData: vi.fn(),
  removeData: vi.fn(),
}));

vi.mock('../api', () => ({
  apiRequest: vi.fn(),
}));

import { storeData, getData, removeData } from '../storage';
import { apiRequest } from '../api';
import NetInfo from '@react-native-community/netinfo';
import { enqueue, getQueue, syncQueue, clearQueue, getQueueSize, isOnline } from '../offline';

describe('isOnline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when connected', async () => {
    vi.mocked(NetInfo.fetch).mockResolvedValueOnce({ isConnected: true } as any);
    expect(await isOnline()).toBe(true);
  });

  it('returns true when NetInfo throws (assumes online)', async () => {
    vi.mocked(NetInfo.fetch).mockRejectedValueOnce(new Error('fail'));
    expect(await isOnline()).toBe(true);
  });
});

describe('enqueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a mutation to the queue', async () => {
    vi.mocked(getData).mockResolvedValueOnce([]);

    await enqueue({
      endpoint: '/api/v1/sales',
      method: 'POST',
      body: { items: [] },
    });

    expect(storeData).toHaveBeenCalledWith(
      'offline_mutation_queue',
      expect.arrayContaining([
        expect.objectContaining({
          endpoint: '/api/v1/sales',
          method: 'POST',
          body: { items: [] },
          retryCount: 0,
        }),
      ]),
    );
  });

  it('appends to existing queue', async () => {
    const existing = [{
      id: '1',
      endpoint: '/api/v1/old',
      method: 'POST' as const,
      body: {},
      createdAt: '2025-01-01',
      retryCount: 0,
    }];
    vi.mocked(getData).mockResolvedValueOnce(existing);

    await enqueue({
      endpoint: '/api/v1/new',
      method: 'PUT',
      body: { x: 1 },
    });

    expect(storeData).toHaveBeenCalledWith(
      'offline_mutation_queue',
      expect.arrayContaining([
        expect.objectContaining({ endpoint: '/api/v1/old' }),
        expect.objectContaining({ endpoint: '/api/v1/new' }),
      ]),
    );
  });
});

describe('syncQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs all mutations when online', async () => {
    vi.mocked(NetInfo.fetch).mockResolvedValueOnce({ isConnected: true } as any);
    vi.mocked(getData).mockResolvedValueOnce([
      { id: '1', endpoint: '/api/v1/sales', method: 'POST', body: {}, createdAt: '', retryCount: 0 },
      { id: '2', endpoint: '/api/v1/orders', method: 'POST', body: {}, createdAt: '', retryCount: 0 },
    ]);
    vi.mocked(apiRequest).mockResolvedValue({ success: true });

    const result = await syncQueue();

    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('returns zero when offline', async () => {
    vi.mocked(NetInfo.fetch).mockResolvedValueOnce({ isConnected: false } as any);

    const result = await syncQueue();
    expect(result).toEqual({ synced: 0, failed: 0 });
  });

  it('increments retryCount on failure and keeps under max retries', async () => {
    vi.mocked(NetInfo.fetch).mockResolvedValueOnce({ isConnected: true } as any);
    vi.mocked(getData).mockResolvedValueOnce([
      { id: '1', endpoint: '/api/v1/fail', method: 'POST', body: {}, createdAt: '', retryCount: 0 },
    ]);
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: false, error: { code: 'ERR', message: 'fail' } });

    const result = await syncQueue();

    expect(result.failed).toBe(1);
    // Should keep in queue with incremented retryCount (was 0, now 1 < 3)
    expect(storeData).toHaveBeenCalledWith(
      'offline_mutation_queue',
      expect.arrayContaining([
        expect.objectContaining({ retryCount: 1 }),
      ]),
    );
  });

  it('drops mutations that exceed max retries', async () => {
    vi.mocked(NetInfo.fetch).mockResolvedValueOnce({ isConnected: true } as any);
    vi.mocked(getData).mockResolvedValueOnce([
      { id: '1', endpoint: '/api/v1/fail', method: 'POST', body: {}, createdAt: '', retryCount: 2 },
    ]);
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: false, error: { code: 'ERR', message: 'fail' } });

    await syncQueue();

    // retryCount becomes 3 which equals MAX_RETRIES, so it's dropped
    expect(storeData).toHaveBeenCalledWith('offline_mutation_queue', []);
  });

  it('returns zero counts for empty queue', async () => {
    vi.mocked(NetInfo.fetch).mockResolvedValueOnce({ isConnected: true } as any);
    vi.mocked(getData).mockResolvedValueOnce([]);

    const result = await syncQueue();
    expect(result).toEqual({ synced: 0, failed: 0 });
  });
});

describe('clearQueue', () => {
  it('removes the queue from storage', async () => {
    await clearQueue();
    expect(removeData).toHaveBeenCalledWith('offline_mutation_queue');
  });
});

describe('getQueueSize', () => {
  it('returns the number of queued mutations', async () => {
    vi.mocked(getData).mockResolvedValueOnce([
      { id: '1', endpoint: '/a', method: 'POST', body: {}, createdAt: '', retryCount: 0 },
      { id: '2', endpoint: '/b', method: 'POST', body: {}, createdAt: '', retryCount: 0 },
    ]);

    expect(await getQueueSize()).toBe(2);
  });

  it('returns 0 when queue is empty', async () => {
    vi.mocked(getData).mockResolvedValueOnce(null);
    expect(await getQueueSize()).toBe(0);
  });
});
