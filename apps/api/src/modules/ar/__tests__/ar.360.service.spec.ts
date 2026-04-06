import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Ar360Service } from '../ar.360.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

describe('Ar360Service', () => {
  let service: Ar360Service;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  const TENANT = TEST_TENANT_ID;
  const USER_ID = 'user-1';
  const PRODUCT_ID = 'product-1';
  const CONFIG_ID = 'config-1';

  const mockConfigRecord = {
    id: CONFIG_ID,
    tenantId: TENANT,
    productId: PRODUCT_ID,
    imageUrls: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
    frameCount: 36,
    autoRotate: true,
    rotationSpeed: 2.5,
    backgroundColor: '#FFFFFF',
    zoomEnabled: true,
    createdBy: USER_ID,
    updatedBy: USER_ID,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
  };

  beforeEach(() => {
    mockPrisma = createMockPrismaService();

    (mockPrisma as any).product360 = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    service = new Ar360Service(mockPrisma as any);
  });

  // ─── create360Config ───────────────────────────────────────────

  describe('create360Config', () => {
    it('creates a new 360 config when none exists', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({ id: PRODUCT_ID, tenantId: TENANT });
      (mockPrisma as any).product360.findFirst.mockResolvedValue(null);
      (mockPrisma as any).product360.create.mockResolvedValue(mockConfigRecord);

      const result = await service.create360Config(TENANT, USER_ID, {
        productId: PRODUCT_ID,
        imageUrls: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        frameCount: 36,
        autoRotate: true,
        rotationSpeed: 2.5,
        backgroundColor: '#FFFFFF',
        zoomEnabled: true,
      });

      expect(result.id).toBe(CONFIG_ID);
      expect(result.frameCount).toBe(36);
      expect((mockPrisma as any).product360.create).toHaveBeenCalledOnce();
    });

    it('upserts when a config already exists for the product', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({ id: PRODUCT_ID, tenantId: TENANT });
      (mockPrisma as any).product360.findFirst.mockResolvedValue(mockConfigRecord);
      const updatedRecord = { ...mockConfigRecord, frameCount: 72 };
      (mockPrisma as any).product360.update.mockResolvedValue(updatedRecord);

      const result = await service.create360Config(TENANT, USER_ID, {
        productId: PRODUCT_ID,
        imageUrls: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        frameCount: 72,
        autoRotate: true,
        rotationSpeed: 2.5,
        backgroundColor: '#FFFFFF',
        zoomEnabled: true,
      });

      expect(result.frameCount).toBe(72);
      expect((mockPrisma as any).product360.update).toHaveBeenCalledOnce();
      expect((mockPrisma as any).product360.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when product does not exist', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue(null);

      await expect(
        service.create360Config(TENANT, USER_ID, {
          productId: 'nonexistent',
          imageUrls: [],
          frameCount: 36,
          autoRotate: true,
          rotationSpeed: 2.5,
          backgroundColor: '#FFFFFF',
          zoomEnabled: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── get360Config ──────────────────────────────────────────────

  describe('get360Config', () => {
    it('returns the config when found', async () => {
      (mockPrisma as any).product360.findFirst.mockResolvedValue(mockConfigRecord);

      const result = await service.get360Config(TENANT, PRODUCT_ID);
      expect(result).not.toBeNull();
      expect(result!.productId).toBe(PRODUCT_ID);
      expect(result!.autoRotate).toBe(true);
    });

    it('returns null when no config exists', async () => {
      (mockPrisma as any).product360.findFirst.mockResolvedValue(null);

      const result = await service.get360Config(TENANT, PRODUCT_ID);
      expect(result).toBeNull();
    });
  });

  // ─── update360Config ───────────────────────────────────────────

  describe('update360Config', () => {
    it('updates config fields and returns the updated config', async () => {
      (mockPrisma as any).product360.findFirst.mockResolvedValue(mockConfigRecord);
      const updatedRecord = { ...mockConfigRecord, autoRotate: false, rotationSpeed: 1.0 };
      (mockPrisma as any).product360.update.mockResolvedValue(updatedRecord);

      const result = await service.update360Config(TENANT, USER_ID, PRODUCT_ID, {
        autoRotate: false,
        rotationSpeed: 1.0,
      });

      expect(result.autoRotate).toBe(false);
      expect(result.rotationSpeed).toBe(1.0);
    });

    it('throws NotFoundException when config does not exist', async () => {
      (mockPrisma as any).product360.findFirst.mockResolvedValue(null);

      await expect(
        service.update360Config(TENANT, USER_ID, 'missing', { autoRotate: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── delete360Config ───────────────────────────────────────────

  describe('delete360Config', () => {
    it('deletes the config and returns success', async () => {
      (mockPrisma as any).product360.findFirst.mockResolvedValue(mockConfigRecord);
      (mockPrisma as any).product360.delete.mockResolvedValue(mockConfigRecord);

      const result = await service.delete360Config(TENANT, PRODUCT_ID);
      expect(result.success).toBe(true);
    });

    it('throws NotFoundException when config does not exist', async () => {
      (mockPrisma as any).product360.findFirst.mockResolvedValue(null);

      await expect(service.delete360Config(TENANT, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listAll360Configs ─────────────────────────────────────────

  describe('listAll360Configs', () => {
    it('returns all configs for the tenant', async () => {
      (mockPrisma as any).product360.findMany.mockResolvedValue([mockConfigRecord]);

      const result = await service.listAll360Configs(TENANT);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(CONFIG_ID);
    });
  });
});
