// ─── tRPC Client for CaratFlow Mobile ───────────────────────────
// Real tRPC v11 React client wired against the NestJS backend at /trpc.
// AppRouter is imported as a type-only reference from apps/api so we get
// end-to-end type safety without pulling apps/api into the runtime bundle.

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { AppRouter } from '../../../api/src/trpc/trpc.router';

/** Must match the key used by apps/mobile/src/lib/auth.ts */
const ACCESS_TOKEN_KEY = 'caratflow_access_token';

export const trpc = createTRPCReact<AppRouter>();

function getApiBaseUrl(): string {
  // EXPO_PUBLIC_API_URL takes precedence, then expo-constants extra, then localhost.
  const envUrl =
    (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined);
  return envUrl ?? 'http://localhost:4000';
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/trpc`,
        async headers() {
          const token = await getAuthToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
