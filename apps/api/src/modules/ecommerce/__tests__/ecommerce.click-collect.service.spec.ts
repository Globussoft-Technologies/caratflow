import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EcommerceClickCollectService } from '../ecommerce.click-collect.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    onlineOrder: { findFirst: vi.fn(), update: vi.fn() },
    location: { findFirst: vi.fn() },
    clickAndCollect: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn(),
    },
  };
}

describe('EcommerceClickCollectService (Unit)', () => {
  let service: EcommerceClickCollectService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  const record = {
    id: 'cc-1', tenantId: TEST_TENANT_ID, orderId: 'o-1', locationId: 'loc-1',
    status: 'READY_FOR_PICKUP', readyAt: new Date(), notifiedAt: null,
    pickedUpAt: null, expiresAt: new Date(Date.now() + 7 * 86400000),
    createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new EcommerceClickCollectService(mockPrisma as any);
  });

  describe('create', () => {
    it('creates a click & collect entry', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValue({ id: 'o-1', orderNumber: 'ON/1' });
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1', name: 'Store' });
      mockPrisma.clickAndCollect.create.mockResolvedValue(record);

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, {
        orderId: 'o-1', locationId: 'loc-1',
      });

      expect(result.status).toBe('READY_FOR_PICKUP');
    });

    it('throws NotFoundException for missing order', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValue(null);
      await expect(
        service.create(TEST_TENANT_ID, TEST_USER_ID, { orderId: 'bad', locationId: 'loc-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for missing location', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValue({ id: 'o-1' });
      mockPrisma.location.findFirst.mockResolvedValue(null);
      await expect(
        service.create(TEST_TENANT_ID, TEST_USER_ID, { orderId: 'o-1', locationId: 'bad' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markNotified', () => {
    it('updates status to NOTIFIED', async () => {
      mockPrisma.clickAndCollect.findFirst.mockResolvedValue(record);
      mockPrisma.clickAndCollect.update.mockResolvedValue({ ...record, status: 'NOTIFIED' });

      const result = await service.markNotified(TEST_TENANT_ID, TEST_USER_ID, 'cc-1');
      expect(result.status).toBe('NOTIFIED');
    });

    it('throws BadRequestException when not READY_FOR_PICKUP', async () => {
      mockPrisma.clickAndCollect.findFirst.mockResolvedValue({ ...record, status: 'PICKED_UP' });
      await expect(
        service.markNotified(TEST_TENANT_ID, TEST_USER_ID, 'cc-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmPickup', () => {
    it('sets status to PICKED_UP and updates order to DELIVERED', async () => {
      mockPrisma.clickAndCollect.findFirst.mockResolvedValue(record);
      mockPrisma.clickAndCollect.update.mockResolvedValue({ ...record, status: 'PICKED_UP' });
      mockPrisma.onlineOrder.update.mockResolvedValue({});

      const result = await service.confirmPickup(TEST_TENANT_ID, TEST_USER_ID, 'cc-1');
      expect(result.status).toBe('PICKED_UP');
      expect(mockPrisma.onlineOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DELIVERED' }),
        }),
      );
    });

    it('throws BadRequestException when already CANCELLED', async () => {
      mockPrisma.clickAndCollect.findFirst.mockResolvedValue({ ...record, status: 'CANCELLED' });
      await expect(
        service.confirmPickup(TEST_TENANT_ID, TEST_USER_ID, 'cc-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('cancels a READY_FOR_PICKUP entry', async () => {
      mockPrisma.clickAndCollect.findFirst.mockResolvedValue(record);
      mockPrisma.clickAndCollect.update.mockResolvedValue({ ...record, status: 'CANCELLED' });

      const result = await service.cancel(TEST_TENANT_ID, TEST_USER_ID, 'cc-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('throws BadRequestException after pickup', async () => {
      mockPrisma.clickAndCollect.findFirst.mockResolvedValue({ ...record, status: 'PICKED_UP' });
      await expect(
        service.cancel(TEST_TENANT_ID, TEST_USER_ID, 'cc-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleExpired', () => {
    it('cancels expired entries and returns count', async () => {
      mockPrisma.clickAndCollect.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.handleExpired(TEST_TENANT_ID);
      expect(result).toBe(2);
    });
  });

  describe('getQueue', () => {
    it('returns active entries for a location', async () => {
      mockPrisma.clickAndCollect.findMany.mockResolvedValue([record]);
      const result = await service.getQueue(TEST_TENANT_ID, 'loc-1');
      expect(result).toHaveLength(1);
    });
  });
});
