import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { HardwareDeviceService } from '../hardware.device.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    setting: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(),
      update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(),
    },
  };
}

describe('HardwareDeviceService (Unit)', () => {
  let service: HardwareDeviceService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  const device = {
    id: 'dev-1', tenantId: TEST_TENANT_ID, name: 'Scale 1',
    deviceType: 'SCALE', connectionType: 'USB', port: 'COM3',
    baudRate: 9600, ipAddress: null, tcpPort: null, vendorId: null,
    productId: null, settings: {}, isActive: true, locationId: 'loc-1',
    status: undefined, lastSeenAt: null,
    createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new HardwareDeviceService(mockPrisma as any);
  });

  describe('registerDevice', () => {
    it('creates a device config in settings', async () => {
      mockPrisma.setting.create.mockResolvedValue({});

      const result = await service.registerDevice(TEST_TENANT_ID, TEST_USER_ID, {
        name: 'Scale 1', deviceType: 'SCALE', connectionType: 'USB',
        port: 'COM3', baudRate: 9600, locationId: 'loc-1',
      } as any);

      expect(result.name).toBe('Scale 1');
      expect(result.id).toBeDefined();
      expect(mockPrisma.setting.create).toHaveBeenCalledOnce();
    });
  });

  describe('listDevices', () => {
    it('returns paginated devices', async () => {
      mockPrisma.setting.findMany.mockResolvedValue([
        { value: JSON.stringify(device) },
        { value: JSON.stringify({ ...device, id: 'dev-2', name: 'Printer 1', deviceType: 'PRINTER' }) },
      ]);

      const result = await service.listDevices(TEST_TENANT_ID, { page: 1, limit: 10 } as any);
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by locationId', async () => {
      mockPrisma.setting.findMany.mockResolvedValue([
        { value: JSON.stringify({ ...device, locationId: 'loc-1' }) },
        { value: JSON.stringify({ ...device, id: 'dev-2', locationId: 'loc-2' }) },
      ]);

      const result = await service.listDevices(TEST_TENANT_ID, {
        page: 1, limit: 10, locationId: 'loc-1',
      } as any);

      expect(result.items).toHaveLength(1);
    });

    it('filters by deviceType', async () => {
      mockPrisma.setting.findMany.mockResolvedValue([
        { value: JSON.stringify(device) },
        { value: JSON.stringify({ ...device, id: 'dev-2', deviceType: 'PRINTER' }) },
      ]);

      const result = await service.listDevices(TEST_TENANT_ID, {
        page: 1, limit: 10, deviceType: 'SCALE',
      } as any);

      expect(result.items).toHaveLength(1);
    });
  });

  describe('getDevice', () => {
    it('returns device when found', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue({ value: JSON.stringify(device) });
      const result = await service.getDevice(TEST_TENANT_ID, 'dev-1');
      expect(result.name).toBe('Scale 1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(null);
      await expect(service.getDevice(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDevice', () => {
    it('updates device configuration', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue({ value: JSON.stringify(device) });
      mockPrisma.setting.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.updateDevice(TEST_TENANT_ID, TEST_USER_ID, 'dev-1', {
        name: 'Updated Scale',
      } as any);

      expect(result.name).toBe('Updated Scale');
    });
  });

  describe('removeDevice', () => {
    it('deletes a device', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue({ id: 's-1' });
      mockPrisma.setting.delete.mockResolvedValue({});

      await service.removeDevice(TEST_TENANT_ID, 'dev-1');
      expect(mockPrisma.setting.delete).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException for missing device', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(null);
      await expect(service.removeDevice(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDeviceStatus', () => {
    it('returns DISCONNECTED by default', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue({ value: JSON.stringify(device) });
      const result = await service.getDeviceStatus(TEST_TENANT_ID, 'dev-1');
      expect(result.status).toBe('DISCONNECTED');
    });
  });
});
