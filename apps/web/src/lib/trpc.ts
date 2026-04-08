'use client';

// tRPC client placeholder -- @trpc/react-query v10 is incompatible with @tanstack/react-query v5
// This mock allows the admin dashboard to render without a working tRPC connection.
// Replace with proper tRPC v11 setup when available.

const noop = () => {};

const createProxy = (): any =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'useQuery') return () => ({ data: undefined, isLoading: false, error: null, refetch: noop });
        if (prop === 'useMutation') return () => ({ mutate: noop, mutateAsync: async () => ({}), isLoading: false });
        if (prop === 'useInfiniteQuery') return () => ({ data: undefined, isLoading: false, fetchNextPage: noop });
        if (prop === 'Provider') return ({ children }: any) => children;
        if (prop === 'createClient') return () => ({});
        if (prop === 'useContext') return () => createProxy();
        if (prop === 'invalidate') return noop;
        return createProxy();
      },
    },
  );

export const trpc: any = createProxy();

export function getTrpcClient() {
  return {};
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  return children as any;
}
