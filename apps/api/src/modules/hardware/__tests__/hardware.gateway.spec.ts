// NOTE: The original HardwareGateway used @nestjs/websockets + socket.io
// with tenant/location rooms, RFID/barcode/scale/biometric/display events.
// That stack was removed in Phase 4 (see hardware.gateway.ts header) and
// replaced with a tiny in-process EventEmitter-based pub/sub used only
// for Customer Facing Display (CFD) state fan-out. These tests were
// rewritten to cover the new, much smaller public surface:
//   - pushCfdState(tenantId, state)
//   - subscribeCfd(tenantId, terminalId, listener) -> unsubscribe
// The obsolete websocket room/scoping tests have been removed.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HardwareGateway } from '../hardware.gateway';

describe('HardwareGateway (CFD pub/sub)', () => {
  let gateway: HardwareGateway;

  beforeEach(() => {
    gateway = new HardwareGateway();
  });

  const makeState = (terminalId: string, overrides: Record<string, unknown> = {}) =>
    ({
      terminalId,
      tenantId: 'tenant-1',
      items: [],
      subtotalPaise: 0,
      totalPaise: 0,
      currency: 'INR',
      updatedAt: new Date().toISOString(),
      ...overrides,
    }) as any;

  it('delivers state to a subscriber for matching tenant+terminal', () => {
    const listener = vi.fn();
    gateway.subscribeCfd('tenant-1', 'pos-1', listener);

    const state = makeState('pos-1');
    gateway.pushCfdState('tenant-1', state);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(state);
  });

  it('does not deliver state to a subscriber for a different terminal', () => {
    const listener = vi.fn();
    gateway.subscribeCfd('tenant-1', 'pos-1', listener);

    gateway.pushCfdState('tenant-1', makeState('pos-2'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not deliver state across tenants (tenant scoping)', () => {
    const listener = vi.fn();
    gateway.subscribeCfd('tenant-1', 'pos-1', listener);

    gateway.pushCfdState('tenant-2', makeState('pos-1'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('wildcard "*" subscriber receives every terminal for its tenant', () => {
    const listener = vi.fn();
    gateway.subscribeCfd('tenant-1', '*', listener);

    gateway.pushCfdState('tenant-1', makeState('pos-1'));
    gateway.pushCfdState('tenant-1', makeState('pos-2'));
    gateway.pushCfdState('tenant-2', makeState('pos-1'));

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('supports multiple subscribers on the same event', () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    gateway.subscribeCfd('tenant-1', 'pos-1', l1);
    gateway.subscribeCfd('tenant-1', 'pos-1', l2);

    gateway.pushCfdState('tenant-1', makeState('pos-1'));

    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('returns an unsubscribe function that stops delivery', () => {
    const listener = vi.fn();
    const unsubscribe = gateway.subscribeCfd('tenant-1', 'pos-1', listener);

    gateway.pushCfdState('tenant-1', makeState('pos-1'));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    gateway.pushCfdState('tenant-1', makeState('pos-1'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('pushing with no subscribers is a no-op and does not throw', () => {
    expect(() =>
      gateway.pushCfdState('tenant-1', makeState('pos-1')),
    ).not.toThrow();
  });
});
