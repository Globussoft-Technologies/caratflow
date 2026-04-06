import { describe, it, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  storeData,
  getData,
  removeData,
  clearAllData,
  storeWithTimestamp,
  getIfFresh,
} from '../storage';

describe('storeData / getData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores and retrieves JSON data', async () => {
    await storeData('test-key', { name: 'Gold Ring', weight: 5000 });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@caratflow/test-key',
      JSON.stringify({ name: 'Gold Ring', weight: 5000 }),
    );
  });

  it('returns null for missing keys', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);

    const result = await getData('nonexistent');
    expect(result).toBeNull();
  });

  it('parses stored JSON on retrieval', async () => {
    const stored = { id: 1, name: 'Necklace' };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(stored));

    const result = await getData('item');
    expect(result).toEqual(stored);
  });

  it('returns null on read error', async () => {
    vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('read fail'));

    const result = await getData('broken');
    expect(result).toBeNull();
  });
});

describe('removeData', () => {
  it('removes the prefixed key from AsyncStorage', async () => {
    await removeData('old-key');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@caratflow/old-key');
  });
});

describe('clearAllData', () => {
  it('removes only keys with the app prefix', async () => {
    vi.mocked(AsyncStorage.getAllKeys).mockResolvedValueOnce([
      '@caratflow/a',
      '@caratflow/b',
      'other-app/c',
    ]);

    await clearAllData();

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      '@caratflow/a',
      '@caratflow/b',
    ]);
  });
});

describe('storeWithTimestamp / getIfFresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores data with a timestamp', async () => {
    const beforeTs = Date.now();
    await storeWithTimestamp('rates', { gold: 6500 });

    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const call = vi.mocked(AsyncStorage.setItem).mock.calls[0]!;
    const stored = JSON.parse(call[1]);
    expect(stored.data).toEqual({ gold: 6500 });
    expect(stored.timestamp).toBeGreaterThanOrEqual(beforeTs);
  });

  it('getIfFresh returns data within maxAge', async () => {
    const fresh = { data: { gold: 6500 }, timestamp: Date.now() - 1000 };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(fresh));

    const result = await getIfFresh('rates', 60_000); // 60s max age
    expect(result).toEqual({ gold: 6500 });
  });

  it('getIfFresh returns null for expired data', async () => {
    const stale = { data: { gold: 6500 }, timestamp: Date.now() - 120_000 };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(stale));

    const result = await getIfFresh('rates', 60_000); // 60s max age
    expect(result).toBeNull();
  });

  it('getIfFresh returns null when no data stored', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);

    const result = await getIfFresh('missing', 60_000);
    expect(result).toBeNull();
  });
});
