import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { RealtimeGateway } from '../realtime.gateway';
import { createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';
import type { DomainEvent } from '@caratflow/shared-types';

const JWT_SECRET = 'test-secret-realtime';

function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET);
}

function makeMockSocket(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sock-' + Math.random().toString(36).slice(2, 8),
    handshake: { auth: {}, headers: {} },
    data: {},
    join: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  } as unknown as Parameters<RealtimeGateway['handleConnection']>[0] & {
    join: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
}

function makeMockServer() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { to, emit } as unknown as RealtimeGateway['server'] & {
    to: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
  };
}

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    mockEventBus = createMockEventBus();
    gateway = new RealtimeGateway(mockEventBus as never);
    gateway.server = makeMockServer() as never;
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('rejects connection without a token', () => {
    const sock = makeMockSocket();
    gateway.handleConnection(sock as never);
    expect(sock.disconnect).toHaveBeenCalledWith(true);
    expect(sock.join).not.toHaveBeenCalled();
  });

  it('rejects connection with an invalid token', () => {
    const sock = makeMockSocket();
    (sock.handshake as { auth: Record<string, unknown> }).auth.token = 'not.a.valid.jwt';
    gateway.handleConnection(sock as never);
    expect(sock.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects a token missing tenantId or sub', () => {
    const sock = makeMockSocket();
    (sock.handshake as { auth: Record<string, unknown> }).auth.token = signToken({
      sub: TEST_USER_ID,
    });
    gateway.handleConnection(sock as never);
    expect(sock.disconnect).toHaveBeenCalledWith(true);
  });

  it('joins tenant and user rooms on valid handshake auth token', () => {
    const sock = makeMockSocket();
    (sock.handshake as { auth: Record<string, unknown> }).auth.token = signToken({
      sub: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
    });
    gateway.handleConnection(sock as never);
    expect(sock.disconnect).not.toHaveBeenCalled();
    expect(sock.join).toHaveBeenCalledWith(`tenant:${TEST_TENANT_ID}`);
    expect(sock.join).toHaveBeenCalledWith(`user:${TEST_USER_ID}`);
  });

  it('accepts Bearer token from Authorization header fallback', () => {
    const sock = makeMockSocket();
    (sock.handshake as { headers: Record<string, unknown> }).headers.authorization =
      'Bearer ' + signToken({ sub: TEST_USER_ID, tenantId: TEST_TENANT_ID });
    gateway.handleConnection(sock as never);
    expect(sock.join).toHaveBeenCalledWith(`tenant:${TEST_TENANT_ID}`);
  });

  it('broadcasts whitelisted event types to the tenant room', () => {
    const event: DomainEvent = {
      id: 'evt-1',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      timestamp: new Date().toISOString(),
      type: 'inventory.stock.adjusted',
      payload: { productId: 'p1', locationId: 'l1', quantityChange: -2, reason: 'shrinkage' },
    };
    gateway.broadcastEvent(event);
    const server = gateway.server as unknown as {
      to: ReturnType<typeof vi.fn>;
      emit: ReturnType<typeof vi.fn>;
    };
    expect(server.to).toHaveBeenCalledWith(`tenant:${TEST_TENANT_ID}`);
    expect(server.emit).toHaveBeenCalledWith(
      'domain-event',
      expect.objectContaining({ type: 'inventory.stock.adjusted', tenantId: TEST_TENANT_ID }),
    );
  });

  it('does NOT broadcast non-whitelisted (sensitive) event types', () => {
    const event = {
      id: 'evt-2',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      timestamp: new Date().toISOString(),
      type: 'financial.payment.received',
      payload: { paymentId: 'p1', amountPaise: 100000, method: 'card', referenceId: 'r1' },
    } as unknown as DomainEvent;
    gateway.broadcastEvent(event);
    const server = gateway.server as unknown as { to: ReturnType<typeof vi.fn> };
    expect(server.to).not.toHaveBeenCalled();
  });

  it('subscribes to broadcastable event types on module init', () => {
    gateway.onModuleInit();
    const subscribedTypes = (mockEventBus.subscribe.mock.calls as Array<[string, unknown]>).map(
      (call) => call[0],
    );
    expect(subscribedTypes).toContain('inventory.stock.adjusted');
    expect(subscribedTypes).toContain('retail.sale.completed');
    expect(subscribedTypes).toContain('manufacturing.job.completed');
    // sensitive events must NOT be auto-subscribed for broadcast
    expect(subscribedTypes).not.toContain('financial.payment.received');
  });
});
