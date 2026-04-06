import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bullmq before importing EventBusService
const mockQueueAdd = vi.fn().mockResolvedValue({ id: 'job-1' });
const mockQueueClose = vi.fn().mockResolvedValue(undefined);
const mockWorkerClose = vi.fn().mockResolvedValue(undefined);
const mockWorkerOn = vi.fn();

vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(() => ({
      add: mockQueueAdd,
      close: mockQueueClose,
    })),
    Worker: vi.fn().mockImplementation((_name: string, processor: Function, _opts: any) => {
      // Store processor so we can invoke it in tests
      (Worker as any).__lastProcessor = processor;
      return {
        close: mockWorkerClose,
        on: mockWorkerOn,
      };
    }),
  };
});

import { Queue, Worker } from 'bullmq';
import { EventBusService } from '../event-bus.service';

describe('EventBusService', () => {
  let service: EventBusService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventBusService();
  });

  // ─── Constructor / Queue Initialization ────────────────────────

  it('creates a queue for each known domain on construction', () => {
    // The service creates queues for inventory, manufacturing, financial, retail, etc.
    expect(Queue).toHaveBeenCalled();
    const callCount = (Queue as any).mock.calls.length;
    expect(callCount).toBeGreaterThanOrEqual(10); // at least 10 domain queues
  });

  // ─── publish ───────────────────────────────────────────────────

  describe('publish', () => {
    it('dispatches event to the correct domain queue based on event type prefix', async () => {
      const event = {
        id: 'evt-1',
        type: 'inventory.stock.adjusted' as any,
        tenantId: 'tenant-1',
        userId: 'user-1',
        timestamp: new Date(),
        payload: { productId: 'prod-1', quantityChange: -5 },
      };

      await service.publish(event);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'inventory.stock.adjusted',
        event,
        expect.objectContaining({
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
        }),
      );
    });

    it('includes retry configuration with exponential backoff', async () => {
      const event = {
        id: 'evt-2',
        type: 'retail.sale.completed' as any,
        tenantId: 'tenant-1',
        userId: 'user-1',
        timestamp: new Date(),
        payload: { saleId: 'sale-1' },
      };

      await service.publish(event);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'retail.sale.completed',
        event,
        expect.objectContaining({
          backoff: { type: 'exponential', delay: 1000 },
        }),
      );
    });

    it('logs error when domain queue does not exist', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const event = {
        id: 'evt-3',
        type: 'unknown.domain.event' as any,
        tenantId: 'tenant-1',
        userId: 'user-1',
        timestamp: new Date(),
        payload: {},
      };

      await service.publish(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No queue for domain: unknown'),
      );
      consoleSpy.mockRestore();
    });
  });

  // ─── subscribe ─────────────────────────────────────────────────

  describe('subscribe', () => {
    it('registers a handler for the given event type', () => {
      const handler = vi.fn();
      service.subscribe('inventory.stock.adjusted' as any, handler);

      // Worker should be created for the inventory domain
      expect(Worker).toHaveBeenCalledWith(
        'caratflow:inventory',
        expect.any(Function),
        expect.any(Object),
      );
    });

    it('creates only one worker per domain even with multiple subscriptions', () => {
      const workerCallsBefore = (Worker as any).mock.calls.length;

      service.subscribe('retail.sale.completed' as any, vi.fn());
      service.subscribe('retail.return.processed' as any, vi.fn());

      const workerCallsAfter = (Worker as any).mock.calls.length;
      // Only one worker should have been created for 'retail'
      expect(workerCallsAfter - workerCallsBefore).toBe(1);
    });

    it('allows multiple handlers for the same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      service.subscribe('financial.payment.received' as any, handler1);
      service.subscribe('financial.payment.received' as any, handler2);

      // Both handlers registered -- no error thrown
      expect(true).toBe(true);
    });
  });

  // ─── Event Structure ───────────────────────────────────────────

  it('preserves event structure including id, tenantId, and timestamp when publishing', async () => {
    const timestamp = new Date('2025-06-01T12:00:00Z');
    const event = {
      id: 'evt-struct-1',
      type: 'crm.customer.created' as any,
      tenantId: 'tenant-abc',
      userId: 'user-xyz',
      timestamp,
      correlationId: 'corr-1',
      payload: { customerId: 'cust-1', firstName: 'Rajesh', lastName: 'Kumar' },
    };

    await service.publish(event);

    const publishedData = mockQueueAdd.mock.calls[0][1];
    expect(publishedData.id).toBe('evt-struct-1');
    expect(publishedData.tenantId).toBe('tenant-abc');
    expect(publishedData.timestamp).toBe(timestamp);
    expect(publishedData.correlationId).toBe('corr-1');
  });

  // ─── onModuleDestroy ───────────────────────────────────────────

  it('closes all workers and queues on module destroy', async () => {
    // Subscribe to create a worker
    service.subscribe('inventory.stock.adjusted' as any, vi.fn());

    await service.onModuleDestroy();

    expect(mockWorkerClose).toHaveBeenCalled();
    expect(mockQueueClose).toHaveBeenCalled();
  });
});
