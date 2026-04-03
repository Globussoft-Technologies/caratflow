// ─── TanStack Query Hooks with Offline Support ─────────────────

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import { enqueue, isOnline } from '@/lib/offline';
import { getIfFresh, storeWithTimestamp } from '@/lib/storage';

/** Generic GET query hook with offline cache fallback */
export function useApiQuery<T>(
  queryKey: QueryKey,
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'> & {
    offlineCacheMs?: number;
  },
) {
  const cacheKey = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);
  const offlineCacheMs = options?.offlineCacheMs ?? 5 * 60 * 1000; // 5 min default

  return useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      const online = await isOnline();

      if (!online) {
        // Try offline cache
        const cached = await getIfFresh<T>(cacheKey, offlineCacheMs);
        if (cached) return cached;
        throw new Error('You are offline and no cached data is available.');
      }

      const response = await api.get<T>(path, params);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Request failed');
      }

      // Cache for offline use
      await storeWithTimestamp(cacheKey, response.data);
      return response.data;
    },
    ...options,
  });
}

/** Generic POST mutation hook with offline queue fallback */
export function useApiMutation<TInput, TOutput = unknown>(
  path: string,
  options?: UseMutationOptions<TOutput, Error, TInput> & {
    offlineQueue?: boolean;
    invalidateKeys?: QueryKey[];
  },
) {
  const queryClient = useQueryClient();
  const offlineQueue = options?.offlineQueue ?? false;
  const invalidateKeys = options?.invalidateKeys ?? [];

  return useMutation<TOutput, Error, TInput>({
    mutationFn: async (input: TInput) => {
      const online = await isOnline();

      if (!online && offlineQueue) {
        await enqueue({
          endpoint: path,
          method: 'POST',
          body: input,
        });
        // Return a placeholder to indicate queued
        return { queued: true } as unknown as TOutput;
      }

      if (!online) {
        throw new Error('You are offline. This action requires an internet connection.');
      }

      const response = await api.post<TOutput>(path, input);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Request failed');
      }
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate relevant queries
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/** Hook for paginated list queries */
export function usePaginatedQuery<T>(
  queryKey: QueryKey,
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  page: number = 1,
  limit: number = 20,
) {
  return useApiQuery<{ items: T[]; total: number; totalPages: number; hasNext: boolean }>(
    [...queryKey, { page, limit, ...params }],
    path,
    { ...params, page, limit },
    {
      offlineCacheMs: 2 * 60 * 1000,
    },
  );
}
