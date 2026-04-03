// ─── Async Storage Helpers for Offline Data ─────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@caratflow/';

export async function storeData<T>(key: string, value: T): Promise<void> {
  try {
    const json = JSON.stringify(value);
    await AsyncStorage.setItem(`${PREFIX}${key}`, json);
  } catch (error) {
    console.error(`[Storage] Failed to store ${key}:`, error);
  }
}

export async function getData<T>(key: string): Promise<T | null> {
  try {
    const json = await AsyncStorage.getItem(`${PREFIX}${key}`);
    if (json === null) return null;
    return JSON.parse(json) as T;
  } catch (error) {
    console.error(`[Storage] Failed to read ${key}:`, error);
    return null;
  }
}

export async function removeData(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${PREFIX}${key}`);
  } catch (error) {
    console.error(`[Storage] Failed to remove ${key}:`, error);
  }
}

export async function clearAllData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter((k) => k.startsWith(PREFIX));
    await AsyncStorage.multiRemove(appKeys);
  } catch (error) {
    console.error('[Storage] Failed to clear data:', error);
  }
}

/** Store data with a timestamp for cache invalidation */
export async function storeWithTimestamp<T>(
  key: string,
  value: T,
): Promise<void> {
  await storeData(key, { data: value, timestamp: Date.now() });
}

/** Get data only if it's fresher than maxAge (in ms) */
export async function getIfFresh<T>(
  key: string,
  maxAgeMs: number,
): Promise<T | null> {
  const stored = await getData<{ data: T; timestamp: number }>(key);
  if (!stored) return null;
  if (Date.now() - stored.timestamp > maxAgeMs) return null;
  return stored.data;
}
