'use client';

import * as React from 'react';
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppRouter } from '../../../api/src/trpc/trpc.router';

/**
 * Real tRPC v11 React client wired against the NestJS backend at /trpc.
 *
 * AppRouter is imported as a type-only reference from apps/api so we get
 * end-to-end type safety without pulling apps/api into the runtime bundle.
 */
export const trpc = createTRPCReact<AppRouter>();

/** Resolve the API base URL. Empty string in the browser uses the current origin. */
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? '';
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}

/** Read the JWT access token from the same place apps/web/src/lib/api.ts uses. */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('accessToken');
  } catch {
    return null;
  }
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/trpc`,
        headers() {
          const token = getAuthToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

/** Backwards-compatible alias kept so existing imports keep working. */
export function getTrpcClient() {
  return createTrpcClient();
}

export function TrpcProvider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient?: QueryClient;
}) {
  const [client] = React.useState(
    () =>
      queryClient ??
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000, retry: 1 },
        },
      }),
  );
  const [trpcClient] = React.useState(() => createTrpcClient());

  // Note: cast children through `as any` to bridge a known
  // duplicate-@types/react instance issue between @tanstack/react-query and the
  // workspace root that pre-dates this file. Runtime is unaffected.
  return (
    <trpc.Provider client={trpcClient} queryClient={client}>
      <QueryClientProvider client={client}>{children as any}</QueryClientProvider>
    </trpc.Provider>
  );
}
