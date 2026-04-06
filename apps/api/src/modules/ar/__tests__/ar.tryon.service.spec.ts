import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ArTryOnService } from '../ar.tryon.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

describe('ArTryOnService', () => {
  let service: ArTryOnService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  const TENANT = TEST_TENANT_ID;
  const PRODUCT_ID = 'product-1';
  const SESSION_DB_ID = 'session-db-1';
  const SESSION_ID = 'tryon-abc12345-1700000000';

  const mockSessionRecord = {
    id: SESSION_DB_ID,
    tenantId: TENANT,
    sessionId: SESSION_ID,
    customerId: null,
    productId: PRODUCT_ID,
    deviceType: 'MOBILE',
    duration: 0,
    screenshotTaken: false,
    sharedVia: null,
    addedToCart: false,
    createdAt: new Date('2025-06-01').toISOString(),
  };

  beforeEach(() => {
    mockPrisma = createMockPrismaService();

    (mockPrisma as any).arAsset = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
    };
    (mockPrisma as any).arTryOnSession = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    };

    service = new ArTryOnService(mockPrisma as any);
  });

  // ─── getTryOnConfig ────────────────────────────────────────────

  describe('getTryOnConfig', () => {
    it('returns try-on config with overlay and model URLs', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({
        id: PRODUCT_ID,
        name: '22K Gold Ring',
        images: [{ url: 'product.jpg' }],
      });
      (mockPrisma as any).arAsset.findFirst
        .mockResolvedValueOnce({
          fileUrl: 'overlay.png',
          category: 'RING',
          metadata: { scale: 1.2, offsetX: 5, offsetY: -3, rotation: 0 },
        })
        .mockResolvedValueOnce({
          fileUrl: 'model.glb',
          category: 'RING',
        });

      const result = await service.getTryOnConfig(TENANT, PRODUCT_ID);

      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.productName).toBe('22K Gold Ring');
      expect(result.overlayUrl).toBe('overlay.png');
      expect(result.modelUrl).toBe('model.glb');
      expect(result.overlayPositioning.scale).toBe(1.2);
      expect(result.category).toBe('RING');
    });

    it('throws NotFoundException when product does not exist', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue(null);

      await expect(service.getTryOnConfig(TENANT, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('returns null URLs when no overlay/model assets exist', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({
        id: PRODUCT_ID,
        name: '22K Gold Ring',
        images: null,
      });
      (mockPrisma as any).arAsset.findFirst.mockResolvedValue(null);

      const result = await service.getTryOnConfig(TENANT, PRODUCT_ID);

      expect(result.overlayUrl).toBeNull();
      expect(result.modelUrl).toBeNull();
      expect(result.productImage).toBe('');
    });
  });

  // ─── startSession ──────────────────────────────────────────────

  describe('startSession', () => {
    it('creates a new try-on session and returns response', async () => {
      (mockPrisma as any).arTryOnSession.create.mockResolvedValue(mockSessionRecord);

      const result = await service.startSession(TENANT, {
        productId: PRODUCT_ID,
        deviceType: 'MOBILE' as any,
      });

      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.deviceType).toBe('MOBILE');
      expect(result.duration).toBe(0);
      expect(result.addedToCart).toBe(false);
      expect((mockPrisma as any).arTryOnSession.create).toHaveBeenCalledOnce();
    });

    it('passes customerId when provided', async () => {
      (mockPrisma as any).arTryOnSession.create.mockResolvedValue({
        ...mockSessionRecord,
        customerId: 'cust-1',
      });

      await service.startSession(TENANT, {
        productId: PRODUCT_ID,
        customerId: 'cust-1',
        deviceType: 'DESKTOP' as any,
      });

      expect((mockPrisma as any).arTryOnSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ customerId: 'cust-1' }),
        }),
      );
    });
  });

  // ─── endSession ────────────────────────────────────────────────

  describe('endSession', () => {
    it('updates session with final metrics', async () => {
      (mockPrisma as any).arTryOnSession.findFirst.mockResolvedValue(mockSessionRecord);
      const endedSession = {
        ...mockSessionRecord,
        duration: 45,
        screenshotTaken: true,
        sharedVia: 'WHATSAPP',
        addedToCart: true,
      };
      (mockPrisma as any).arTryOnSession.update.mockResolvedValue(endedSession);

      const result = await service.endSession(TENANT, {
        sessionId: SESSION_ID,
        duration: 45,
        screenshotTaken: true,
        sharedVia: 'WHATSAPP',
        addedToCart: true,
      });

      expect(result.duration).toBe(45);
      expect(result.screenshotTaken).toBe(true);
      expect(result.sharedVia).toBe('WHATSAPP');
      expect(result.addedToCart).toBe(true);
    });

    it('throws NotFoundException when session does not exist', async () => {
      (mockPrisma as any).arTryOnSession.findFirst.mockResolvedValue(null);

      await expect(
        service.endSession(TENANT, {
          sessionId: 'nonexistent',
          duration: 10,
          screenshotTaken: false,
          addedToCart: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getAnalytics ──────────────────────────────────────────────

  describe('getAnalytics', () => {
    it('returns analytics with conversion rate and device breakdown', async () => {
      (mockPrisma as any).arTryOnSession.count
        .mockResolvedValueOnce(100)  // totalSessions
        .mockResolvedValueOnce(25)   // sessionsWithCart
        .mockResolvedValueOnce(40)   // sessionsWithScreenshot
        .mockResolvedValueOnce(10);  // sessionsWithShare

      (mockPrisma as any).arTryOnSession.aggregate.mockResolvedValue({ _avg: { duration: 32 } });

      (mockPrisma as any).arTryOnSession.groupBy
        .mockResolvedValueOnce([
          { deviceType: 'MOBILE', _count: { id: 70 } },
          { deviceType: 'DESKTOP', _count: { id: 30 } },
        ])
        .mockResolvedValueOnce([
          { productId: PRODUCT_ID, _count: { id: 50 } },
        ])
        .mockResolvedValueOnce([
          { productId: PRODUCT_ID, _count: { id: 15 } },
        ]);

      (mockPrisma as any).product.findFirst.mockResolvedValue(null);
      // findMany for product names
      (mockPrisma as any).product = {
        ...((mockPrisma as any).product ?? {}),
        findFirst: (mockPrisma as any).product.findFirst,
        findMany: vi.fn().mockResolvedValue([{ id: PRODUCT_ID, name: '22K Gold Ring' }]),
      };

      (mockPrisma as any).arAsset.groupBy.mockResolvedValue([
        { category: 'RING', _count: { id: 30 } },
        { category: 'NECKLACE', _count: { id: 20 } },
      ]);

      (mockPrisma as any).arTryOnSession.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics(TENANT, {});

      expect(result.totalSessions).toBe(100);
      expect(result.conversionRate).toBe(25.0);
      expect(result.screenshotRate).toBe(40.0);
      expect(result.shareRate).toBe(10.0);
      expect(result.avgDuration).toBe(32);
      expect(result.deviceBreakdown).toHaveLength(2);
      expect(result.deviceBreakdown[0].deviceType).toBe('MOBILE');
      expect(result.deviceBreakdown[0].percentage).toBe(70.0);
    });

    it('returns zero rates when there are no sessions', async () => {
      (mockPrisma as any).arTryOnSession.count.mockResolvedValue(0);
      (mockPrisma as any).arTryOnSession.aggregate.mockResolvedValue({ _avg: { duration: null } });
      (mockPrisma as any).arTryOnSession.groupBy.mockResolvedValue([]);
      (mockPrisma as any).arTryOnSession.findMany.mockResolvedValue([]);
      (mockPrisma as any).arAsset.groupBy.mockResolvedValue([]);

      const result = await service.getAnalytics(TENANT, {});

      expect(result.totalSessions).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.avgDuration).toBe(0);
      expect(result.topProducts).toHaveLength(0);
      expect(result.deviceBreakdown).toHaveLength(0);
    });

    it('filters by category when provided', async () => {
      (mockPrisma as any).arAsset.findMany.mockResolvedValue([
        { productId: PRODUCT_ID },
      ]);
      (mockPrisma as any).arTryOnSession.count.mockResolvedValue(0);
      (mockPrisma as any).arTryOnSession.aggregate.mockResolvedValue({ _avg: { duration: null } });
      (mockPrisma as any).arTryOnSession.groupBy.mockResolvedValue([]);
      (mockPrisma as any).arTryOnSession.findMany.mockResolvedValue([]);
      (mockPrisma as any).arAsset.groupBy.mockResolvedValue([]);

      await service.getAnalytics(TENANT, { category: 'RING' as any });

      expect((mockPrisma as any).arAsset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'RING' }),
        }),
      );
    });
  });
});
