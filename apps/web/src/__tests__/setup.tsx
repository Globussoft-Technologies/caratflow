import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
    return <a href={href} {...props}>{children}</a>;
  },
}));

// Mock @/lib/trpc - creates a deep proxy that returns mock query/mutation hooks
function createRecursiveProxy(): unknown {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'useQuery') {
        return () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() });
      }
      if (prop === 'useMutation') {
        return () => ({ mutate: vi.fn(), isPending: false, error: null, isSuccess: false });
      }
      return createRecursiveProxy();
    },
  };
  return new Proxy({}, handler);
}

vi.mock('@/lib/trpc', () => ({
  trpc: createRecursiveProxy(),
}));
