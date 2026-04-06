import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// Mock scrollIntoView (not implemented in jsdom, used by cmdk)
Element.prototype.scrollIntoView = vi.fn();

// Radix UI portals need an element to mount to
if (!document.getElementById('radix-portal')) {
  const portalRoot = document.createElement('div');
  portalRoot.id = 'radix-portal';
  document.body.appendChild(portalRoot);
}
