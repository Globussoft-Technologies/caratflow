// ─── BarcodeScanner component tests ──────────────────────────────
// Follows the shallow-render convention used by the other component
// tests in this directory (Button.test.tsx, Avatar.test.tsx, etc.).
// We invoke the function component directly and walk the returned
// element tree. Because BarcodeScanner uses React hooks, we shim the
// `react` module's named exports so hooks work without a renderer.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── React hook shim ─────────────────────────────────────────────

type RenderState = { states: any[]; idx: number };
let activeRender: RenderState | null = null;

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: (init: any) => {
      if (!activeRender) {
        let val = typeof init === 'function' ? init() : init;
        return [val, (v: any) => { val = typeof v === 'function' ? v(val) : v; }];
      }
      const i = activeRender.idx++;
      const cell = activeRender;
      if (!(i in cell.states)) {
        cell.states[i] = typeof init === 'function' ? init() : init;
      }
      return [
        cell.states[i],
        (v: any) => {
          cell.states[i] = typeof v === 'function' ? v(cell.states[i]) : v;
        },
      ];
    },
    useEffect: () => {
      /* skipped during shallow render */
    },
    useCallback: (fn: any) => fn,
    useMemo: (fn: any) => fn(),
    useRef: (init: any) => ({ current: init }),
    default: actual,
  };
});

// ─── expo-camera mock ────────────────────────────────────────────
// The global setup.ts mocks expo-camera, but these tests need to drive
// the permission state variant-by-variant; override locally.

type Perm = { granted: boolean; canAskAgain: boolean } | null;

const permState: { value: Perm } = { value: { granted: true, canAskAgain: true } };
const requestPermissionMock = vi.fn(async () => {
  permState.value = { granted: true, canAskAgain: true };
});

vi.mock('expo-camera', () => ({
  CameraView: ({ children, ...props }: any) => ({
    type: 'CameraView',
    props: { ...props, children },
  }),
  useCameraPermissions: () => [permState.value, requestPermissionMock],
}));

import { BarcodeScanner } from '../BarcodeScanner';

// ─── Helpers ─────────────────────────────────────────────────────

function shallowRender<P>(Component: (props: P) => any, props: P): any {
  const previous = activeRender;
  activeRender = { states: [], idx: 0 };
  try {
    return Component(props);
  } finally {
    activeRender = previous;
  }
}

function typeNameOf(node: any): string {
  if (!node || typeof node !== 'object') return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

function flatten(node: any, out: any[] = []): any[] {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (Array.isArray(node)) {
    node.forEach((c) => flatten(c, out));
    return out;
  }
  if (typeof node !== 'object') return out;
  out.push(node);
  const children = node.props?.children;
  if (children !== undefined) flatten(children, out);
  return out;
}

describe('BarcodeScanner', () => {
  beforeEach(() => {
    requestPermissionMock.mockClear();
    permState.value = { granted: true, canAskAgain: true };
  });

  it('renders an ActivityIndicator while permission is still loading (null)', () => {
    permState.value = null;
    const tree = shallowRender(BarcodeScanner, { onScanned: vi.fn() });
    expect(typeNameOf(tree)).toBe('View');
    const spinner = flatten(tree).find(
      (n) => typeNameOf(n) === 'ActivityIndicator',
    );
    expect(spinner).toBeDefined();
  });

  it('prompts for permission when camera access has been denied', () => {
    permState.value = { granted: false, canAskAgain: true };
    const tree = shallowRender(BarcodeScanner, {
      onScanned: vi.fn(),
      onClose: vi.fn(),
    });
    const texts = flatten(tree)
      .filter((n) => typeNameOf(n) === 'Text')
      .map((n) => n.props.children);
    const joined = texts.flat().join(' ');
    expect(joined).toMatch(/Camera permission is required/);
    expect(joined).toMatch(/Grant Permission/);
  });

  it('tapping "Grant Permission" invokes requestPermission', () => {
    permState.value = { granted: false, canAskAgain: true };
    const tree = shallowRender(BarcodeScanner, { onScanned: vi.fn() });
    const pressables = flatten(tree).filter(
      (n) => typeNameOf(n) === 'Pressable',
    );
    // First Pressable is the grant button
    pressables[0].props.onPress();
    expect(requestPermissionMock).toHaveBeenCalled();
  });

  it('renders the CameraView overlay when permission is granted', () => {
    permState.value = { granted: true, canAskAgain: true };
    const tree = shallowRender(BarcodeScanner, { onScanned: vi.fn() });
    const cam = flatten(tree).find((n) => typeNameOf(n) === 'CameraView');
    expect(cam).toBeDefined();
    expect(cam.props.facing).toBe('back');
    expect(Array.isArray(cam.props.barcodeScannerSettings.barcodeTypes)).toBe(
      true,
    );
  });

  it('invokes onScanned when CameraView fires a barcode result', () => {
    permState.value = { granted: true, canAskAgain: true };
    const onScanned = vi.fn();
    const tree = shallowRender(BarcodeScanner, { onScanned });
    const cam = flatten(tree).find((n) => typeNameOf(n) === 'CameraView');
    cam.props.onBarcodeScanned({ data: 'SKU-42', type: 'qr' });
    expect(onScanned).toHaveBeenCalledWith('SKU-42', 'qr');
  });

  it('does not pass onBarcodeScanned when paused is true', () => {
    permState.value = { granted: true, canAskAgain: true };
    const tree = shallowRender(BarcodeScanner, {
      onScanned: vi.fn(),
      paused: true,
    });
    const cam = flatten(tree).find((n) => typeNameOf(n) === 'CameraView');
    expect(cam.props.onBarcodeScanned).toBeUndefined();
  });
});
