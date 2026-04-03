'use client';

import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import type { AppRouter } from '@caratflow/api/src/trpc/trpc.router';

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/trpc`,
        headers() {
          const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
