import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { HardwareDeviceService } from '../hardware.device.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    hardwareDevice: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
}

function mockEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };
}

const baseDevice = {
  id: 'dev-1',
  tenantId: TEST_TENANT_ID,
  locationId: 'loc-1',
  name: 'Scale 1',
  deviceType: 'WEIGHING_SCALE',
  connectionType: 'SERIAL',
  port: 'COM3',
  baudRate: 9600,
  ipAddress: null,
  tcpPort: null,
  vendorId: null,
  productId: null,
  settings: {},
  status: 'DISCONNECTED',
  isActive: true,
  lastSeenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('HardwareDeviceService (Unit)', () => {
  let service: HardwareDeviceService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  let eventBus: ReturnType<typeof mockEventBus>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    eventBus = mockEventBus();
    service = new HardwareDeviceService(mockPrisma as any, eventBus as any);
  });

  describe('registerDevice', () => {
    it('creates a device row in hardwareDevice table with DISCONNECTED status', async () => {
      mockPrisma.hardwareDevice.create.mockResolvedValue(baseDevice);

      const result = await service.registerDevice(TEST_TENANT_ID, TEST_USER_ID, {
        name: 'Scale 1',
        deviceType: 'WEIGHING_SCALE',
        connectionType: 'SERIAL',
        port: 'COM3',
        baudRate: 9600,
        locationId: 'loc-1',
      } as any);

      expect(result.name).toBe('Scale 1');
      expect(result.status).toBe('DISCONNECTED');
      const args = mockPrisma.hardwareDevice.create.mock.calls[0][0];
      expect(args.data.tenantId).toBe(TEST_TENANT_ID);
      expect(args.data.createdBy).toBe(TEST_USER_ID);
    });
  });

  describe('listDevices', () => {
    it('returns paginated devices with totals', async () => {
      mockPrisma.hardwareDevice.count.mockResolvedValue(2);
      mockPrisma.hardwareDevice.findMany.mockResolvedValue([
        baseDevice,
        { ...baseDevice, id: 'dev-2', deviceType: 'LABEL_PRINTER', name: 'Printer' },
      ]);

      const result = await service.listDevices(TEST_TENANT_ID, { page: 1, limit: 10 } as any);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('filters by locationId and deviceType', async () => {
      mockPrisma.hardwareDevice.count.mockResolvedValue(0);
      mockPrisma.hardwareDevice.findMany.mockResolvedValue([]);

      await service.listDevices(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
        locationId: 'loc-9',
        deviceType: 'WEIGHING_SCALE',
        isActive: true,
      } as any);

      const where = mockPrisma.hardwareDevice.findMany.mock.calls[0][0].where;
      expect(where).toEqual(
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          locationId: 'loc-9',
          deviceType: 'WEIGHING_SCALE',
          isActive: true,
        }),
      );
    });
  });

  describe('getDevice', () => {
    it('returns device when found', async () => {
      mockPrisma.hardwareDevice.findFirst.mockResolvedValue(baseDevice);
      const result = await service.getDevice(TEST_TENANT_ID, 'dev-1');
      expect(result.name).toBe('Scale 1');
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.hardwareDevice.findFirst.mockResolvedValue(null);
      await expect(service.getDevice(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDevice', () => {
    it('updates only provided fields', async () => {
      mockPrisma.hardwareDevice.findFirst.mockResolvedValue(baseDevice);
      mockPrisma.hardwareDevice.update.mockResolvedValue({ ...baseDevice, name: 'Renamed' });

      const result = await service.updateDevice(TEST_TENANT_ID, TEST_USER_ID, 'dev-1', {
        name: 'Renamed',
      } as any);

      expect(result.name).toBe('Renamed');
      const updateArg = mockPrisma.hardwareDevice.update.mock.calls[0][0];
      expect(updateArg.data.name).toBe('Renamed');
      expect(updateArg.data.deviceType).toBeUndefined();
      expect(updateArg.data.updatedBy).toBe(TEST_USER_ID);
    });
  });

  describe('removeDevice', () => {
    it('deletes an existing device', async () => {
      mockPrisma.hardwareDevice.findFirst.mockResolvedValue(baseDevice);
      mockPrisma.hardwareDevice.delete.mockResolvedValue({});
      await service.removeDevice(TEST_TENANT_ID, 'dev-1');
      expect(mockPrisma.hardwareDevice.delete).toHaveBeenCalledWith({ where: { id: 'dev-1' } });
    });

    it('throws NotFoundException for missing device', async () => {
      mockPrisma.hardwareDevice.findFirst.mockResolvedValue(null);
      await expect(service.removeDevice(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDeviceStatus', () => {
    it('updates status and emits hardware.device.status_changed event', async () => {
      mockPrisma.hardwareDevice.findFirst.mockResolvedValue(baseDevice);
      mockPrisma.hardwareDevice.update.mockResolvedValue({});

      await service.updateDeviceStatus(TEST_TENANT_ID, 'dev-1', 'CONNECTED' as any);

      expect(mockPrisma.hardwareDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-1' },
          data: expect.objectContaining({ status: 'CONNECTED', lastSeenAt: expect.any(Date) }),
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hardware.device.status_changed',
          tenantId: TEST_TENANT_ID,
          payload: expect.objectContaining({ deviceId: 'dev-1', status: 'CONNECTED' }),
        }),
      );
    });

    it('does not refresh lastSeenAt for non-CONNECTED transitions', async () => {
      mockPrisma.hardwareDevice.findFirst.mockResolvedValue(baseDevice);
      mockPrisma.hardwareDevice.update.mockResolvedValue({});

      await service.updateDeviceStatus(TEST_TENANT_ID, 'dev-1', 'DISCONNECTED' as any);

      const args = mockPrisma.hardwareDevice.update.mock.calls[0][0];
      expect(args.data.status).toBe('DISCONNECTED');
      expect(args.data.lastSeenAt).toBeUndefined();
    });

    it('throws NotFoundException for missing device', async () => {
      mockPrisma.hardwareDevice.findFirst.mockResolvedValue(null);
      await expect(
        service.updateDeviceStatus(TEST_TENANT_ID, 'bad', 'CONNECTED' as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDeviceStatus', () => {
    it('returns the current status', async () => {
      mockPrisma.hardwareDevice.findFirst.mockResolvedValue({
        ...baseDevice,
        status: 'CONNECTED',
      });
      const result = await service.getDeviceStatus(TEST_TENANT_ID, 'dev-1');
      expect(result.status).toBe('CONNECTED');
    });
  });
});
