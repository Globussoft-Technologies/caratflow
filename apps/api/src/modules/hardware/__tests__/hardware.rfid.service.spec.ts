import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import {
  HardwareRfidService,
  SimulatedRfidReader,
  ImpinjRfidReader,
  ZebraRfidReader,
} from '../hardware.rfid.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    serialNumber: {
      findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(),
    },
  };
}

describe('HardwareRfidService (Unit)', () => {
  let service: HardwareRfidService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    mockEventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    service = new HardwareRfidService(mockPrisma as any, mockEventBus as any);
  });

  describe('lookupTag', () => {
    it('returns product info when tag is found', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue({
        serialNumber: 'SN-001', status: 'AVAILABLE',
        product: { id: 'p-1', sku: 'GR-001', name: 'Gold Ring' },
        location: { id: 'loc-1', name: 'Main' },
      });

      const result = await service.lookupTag(TEST_TENANT_ID, 'EPC-123');
      expect(result.productId).toBe('p-1');
      expect(result.productSku).toBe('GR-001');
      expect(result.serialNumber).toBe('SN-001');
    });

    it('returns null fields when tag is not found', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue(null);

      const result = await service.lookupTag(TEST_TENANT_ID, 'EPC-UNKNOWN');
      expect(result.productId).toBeNull();
      expect(result.serialNumber).toBeNull();
      expect(result.epc).toBe('EPC-UNKNOWN');
    });
  });

  describe('processScans', () => {
    it('processes multiple tags and returns results', async () => {
      mockPrisma.serialNumber.findFirst
        .mockResolvedValueOnce({
          serialNumber: 'SN-1', status: 'AVAILABLE',
          product: { id: 'p-1', sku: 'SK-1', name: 'Ring' },
          location: { id: 'l-1', name: 'Main' },
        })
        .mockResolvedValueOnce(null);

      const result = await service.processScans(TEST_TENANT_ID, {
        tags: [{ tagId: 't1', epc: 'EPC-1' }, { tagId: 't2', epc: 'EPC-2' }],
      } as any);

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('p-1');
      expect(result[1].productId).toBeNull();
    });
  });

  describe('stockTake', () => {
    it('categorizes tags into matched, unmatched, and missing', async () => {
      mockPrisma.serialNumber.findMany.mockResolvedValue([
        { rfidTag: 'EPC-1', serialNumber: 'SN-1', status: 'AVAILABLE', product: { id: 'p-1', sku: 'SK-1', name: 'Ring' } },
        { rfidTag: 'EPC-3', serialNumber: 'SN-3', status: 'AVAILABLE', product: { id: 'p-3', sku: 'SK-3', name: 'Bracelet' } },
      ]);

      const result = await service.stockTake(TEST_TENANT_ID, {
        locationId: 'loc-1',
        scannedTags: [
          { tagId: 't1', epc: 'EPC-1' },
          { tagId: 't2', epc: 'EPC-2' }, // unmatched
        ],
      });

      expect(result.matched).toHaveLength(1);
      expect(result.matched[0].serialNumber).toBe('SN-1');
      expect(result.unmatched).toHaveLength(1);
      expect(result.unmatched[0].epc).toBe('EPC-2');
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].rfidTag).toBe('EPC-3');
      expect(result.totalScanned).toBe(2);
    });
  });

  describe('antiTheftCheck', () => {
    it('authorizes SOLD items', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue({
        serialNumber: 'SN-1', status: 'SOLD',
        product: { name: 'Ring' },
      });

      const result = await service.antiTheftCheck(TEST_TENANT_ID, { tagId: 't1', epc: 'EPC-1' });
      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toContain('sold');
    });

    it('authorizes IN_TRANSIT items', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue({
        serialNumber: 'SN-1', status: 'IN_TRANSIT',
        product: { name: 'Ring' },
      });

      const result = await service.antiTheftCheck(TEST_TENANT_ID, { tagId: 't1', epc: 'EPC-1' });
      expect(result.isAuthorized).toBe(true);
    });

    it('flags AVAILABLE items as unauthorized', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue({
        serialNumber: 'SN-1', status: 'AVAILABLE',
        product: { name: 'Ring' },
      });

      const result = await service.antiTheftCheck(TEST_TENANT_ID, { tagId: 't1', epc: 'EPC-1' });
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain('AVAILABLE');
    });

    it('flags unknown tags as unauthorized', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue(null);

      const result = await service.antiTheftCheck(TEST_TENANT_ID, { tagId: 't1', epc: 'EPC-X' });
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain('Unknown');
    });
  });

  describe('writeTag', () => {
    it('associates RFID tag with serial number', async () => {
      mockPrisma.serialNumber.findFirst
        .mockResolvedValueOnce({ id: 'sn-1' }) // found serial
        .mockResolvedValueOnce(null); // no existing tag
      mockPrisma.serialNumber.update.mockResolvedValue({});

      await service.writeTag(TEST_TENANT_ID, TEST_USER_ID, 'sn-1', { data: 'EPC-NEW' } as any);
      expect(mockPrisma.serialNumber.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ rfidTag: 'EPC-NEW' }) }),
      );
    });

    it('throws NotFoundException for unknown serial', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue(null);
      await expect(
        service.writeTag(TEST_TENANT_ID, TEST_USER_ID, 'bad', { data: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when tag already assigned to another serial', async () => {
      mockPrisma.serialNumber.findFirst
        .mockResolvedValueOnce({ id: 'sn-1' })
        .mockResolvedValueOnce({ id: 'sn-other', serialNumber: 'SN-OTHER' });

      await expect(
        service.writeTag(TEST_TENANT_ID, TEST_USER_ID, 'sn-1', { data: 'EPC-DUP' } as any),
      ).rejects.toThrow();
    });
  });

  // ─── Driver / readTags ─────────────────────────────────────
  describe('readTags (simulated driver)', () => {
    beforeEach(() => {
      process.env.RFID_DRIVER = 'simulated';
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function buildTaggedRow(n: number) {
      return {
        id: `sn-${n}`,
        rfidTag: `EPC-${n}`,
        serialNumber: `SN-${n}`,
        status: 'AVAILABLE',
        product: { id: `p-${n}`, sku: `SK-${n}`, name: `Product ${n}` },
      };
    }

    it('returns 3-6 enriched tags from Prisma with readTimestamp', async () => {
      // Rebuild service so it picks up RFID_DRIVER=simulated from env.
      service = new HardwareRfidService(mockPrisma as any, mockEventBus as any);

      const pool = [1, 2, 3, 4, 5, 6, 7, 8].map(buildTaggedRow);
      mockPrisma.serialNumber.findMany.mockResolvedValue(pool);

      const promise = service.readTags(TEST_TENANT_ID, 'reader-1');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.length).toBeLessThanOrEqual(6);
      for (const r of result) {
        expect(r.tagId).toMatch(/^EPC-/);
        expect(r.productId).toMatch(/^p-/);
        expect(r.sku).toMatch(/^SK-/);
        expect(r.name).toMatch(/^Product /);
        expect(typeof r.readTimestamp).toBe('string');
      }

      // Query filters by tenant + non-null rfidTag
      expect(mockPrisma.serialNumber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            rfidTag: { not: null },
          }),
        }),
      );
    });

    it('emits hardware.rfid.scanned per tag', async () => {
      service = new HardwareRfidService(mockPrisma as any, mockEventBus as any);

      const pool = [1, 2, 3, 4].map(buildTaggedRow);
      mockPrisma.serialNumber.findMany.mockResolvedValue(pool);

      const promise = service.readTags(TEST_TENANT_ID, 'reader-1');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockEventBus.publish).toHaveBeenCalledTimes(result.length);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hardware.rfid.scanned',
          tenantId: TEST_TENANT_ID,
          payload: expect.objectContaining({
            deviceId: expect.stringContaining('reader-1'),
          }),
        }),
      );
    });

    it('returns [] when no tagged serials exist', async () => {
      service = new HardwareRfidService(mockPrisma as any, mockEventBus as any);
      mockPrisma.serialNumber.findMany.mockResolvedValue([]);

      const promise = service.readTags(TEST_TENANT_ID, 'reader-1');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('reports simulated as the active driver name by default', () => {
      service = new HardwareRfidService(mockPrisma as any, mockEventBus as any);
      expect(service.getDriverName()).toBe('simulated');
    });
  });

  describe('SimulatedRfidReader', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('implements IDevice and tracks connection state', async () => {
      const onTagsRead = vi.fn();
      const driver = new SimulatedRfidReader(
        'reader-x',
        { prisma: mockPrisma as any, eventBus: mockEventBus as any, onTagsRead },
        TEST_TENANT_ID,
      );

      expect(driver.deviceId).toBe('reader-x');
      expect(driver.deviceType).toBe('RFID_READER');

      const disconnected = await driver.status();
      expect(disconnected.status).toBe('DISCONNECTED');

      await driver.connect();
      const connected = await driver.status();
      expect(connected.status).toBe('CONNECTED');

      await driver.disconnect();
      const again = await driver.status();
      expect(again.status).toBe('DISCONNECTED');
    });

    it('returns empty list when no tenant context is set', async () => {
      const driver = new SimulatedRfidReader(
        'reader-x',
        {
          prisma: mockPrisma as any,
          eventBus: mockEventBus as any,
          onTagsRead: vi.fn(),
        },
        null,
      );

      const promise = driver.read();
      await vi.runAllTimersAsync();
      const tags = await promise;

      expect(tags).toEqual([]);
      expect(mockPrisma.serialNumber.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── Impinj + Zebra simulation-fallback drivers ────────────
  describe('ImpinjRfidReader (simulation fallback)', () => {
    const originalHost = process.env.RFID_IMPINJ_HOST;

    beforeEach(() => {
      vi.useFakeTimers();
      delete process.env.RFID_IMPINJ_HOST;
    });

    afterEach(() => {
      vi.useRealTimers();
      if (originalHost === undefined) {
        delete process.env.RFID_IMPINJ_HOST;
      } else {
        process.env.RFID_IMPINJ_HOST = originalHost;
      }
    });

    function buildTaggedRow(n: number) {
      return {
        id: `sn-${n}`,
        rfidTag: `EPC-${n}`,
        serialNumber: `SN-${n}`,
        status: 'AVAILABLE',
        product: { id: `p-${n}`, sku: `SK-${n}`, name: `Product ${n}` },
      };
    }

    it('returns 3-6 enriched tags from Prisma and emits events', async () => {
      const onTagsRead = vi.fn();
      const driver = new ImpinjRfidReader(
        'reader-impinj',
        '127.0.0.1',
        5084,
        { prisma: mockPrisma as any, eventBus: mockEventBus as any, onTagsRead },
        TEST_TENANT_ID,
      );

      const pool = [1, 2, 3, 4, 5, 6, 7, 8].map(buildTaggedRow);
      mockPrisma.serialNumber.findMany.mockResolvedValue(pool);

      await driver.connect();
      const promise = driver.read();
      await vi.runAllTimersAsync();
      const tags = await promise;

      expect(tags).not.toBeNull();
      expect(tags!.length).toBeGreaterThanOrEqual(3);
      expect(tags!.length).toBeLessThanOrEqual(6);
      for (const t of tags!) {
        expect(t.tagId).toMatch(/^EPC-/);
        expect(t.productId).toMatch(/^p-/);
      }

      expect(mockPrisma.serialNumber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            rfidTag: { not: null },
          }),
        }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledTimes(tags!.length);
      expect(onTagsRead).toHaveBeenCalledWith(TEST_TENANT_ID, 'reader-impinj', tags);
    });

    it('returns empty list when no tenant context is set', async () => {
      const driver = new ImpinjRfidReader(
        'reader-impinj',
        '127.0.0.1',
        5084,
        { prisma: mockPrisma as any, eventBus: mockEventBus as any, onTagsRead: vi.fn() },
        null,
      );

      const promise = driver.read();
      await vi.runAllTimersAsync();
      const tags = await promise;

      expect(tags).toEqual([]);
      expect(mockPrisma.serialNumber.findMany).not.toHaveBeenCalled();
    });

    it('tracks connection state', async () => {
      const driver = new ImpinjRfidReader(
        'reader-impinj',
        '127.0.0.1',
        5084,
        { prisma: mockPrisma as any, eventBus: mockEventBus as any, onTagsRead: vi.fn() },
        TEST_TENANT_ID,
      );

      expect((await driver.status()).status).toBe('DISCONNECTED');
      await driver.connect();
      expect((await driver.status()).status).toBe('CONNECTED');
      expect((await driver.status()).message).toContain('simulation fallback');
      await driver.disconnect();
      expect((await driver.status()).status).toBe('DISCONNECTED');
    });
  });

  describe('ZebraRfidReader (simulation fallback)', () => {
    const originalHost = process.env.RFID_ZEBRA_HOST;

    beforeEach(() => {
      vi.useFakeTimers();
      delete process.env.RFID_ZEBRA_HOST;
    });

    afterEach(() => {
      vi.useRealTimers();
      if (originalHost === undefined) {
        delete process.env.RFID_ZEBRA_HOST;
      } else {
        process.env.RFID_ZEBRA_HOST = originalHost;
      }
    });

    function buildTaggedRow(n: number) {
      return {
        id: `sn-${n}`,
        rfidTag: `EPC-${n}`,
        serialNumber: `SN-${n}`,
        status: 'AVAILABLE',
        product: { id: `p-${n}`, sku: `SK-${n}`, name: `Product ${n}` },
      };
    }

    it('returns 3-6 enriched tags from Prisma and emits events', async () => {
      const onTagsRead = vi.fn();
      const driver = new ZebraRfidReader(
        'reader-zebra',
        '127.0.0.1',
        443,
        { prisma: mockPrisma as any, eventBus: mockEventBus as any, onTagsRead },
        TEST_TENANT_ID,
      );

      const pool = [1, 2, 3, 4, 5, 6, 7, 8].map(buildTaggedRow);
      mockPrisma.serialNumber.findMany.mockResolvedValue(pool);

      await driver.connect();
      const promise = driver.read();
      await vi.runAllTimersAsync();
      const tags = await promise;

      expect(tags).not.toBeNull();
      expect(tags!.length).toBeGreaterThanOrEqual(3);
      expect(tags!.length).toBeLessThanOrEqual(6);

      expect(mockPrisma.serialNumber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            rfidTag: { not: null },
          }),
        }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledTimes(tags!.length);
      expect(onTagsRead).toHaveBeenCalledWith(TEST_TENANT_ID, 'reader-zebra', tags);
    });

    it('returns empty list when tagged pool is empty', async () => {
      const driver = new ZebraRfidReader(
        'reader-zebra',
        '127.0.0.1',
        443,
        { prisma: mockPrisma as any, eventBus: mockEventBus as any, onTagsRead: vi.fn() },
        TEST_TENANT_ID,
      );
      mockPrisma.serialNumber.findMany.mockResolvedValue([]);

      const promise = driver.read();
      await vi.runAllTimersAsync();
      const tags = await promise;

      expect(tags).toEqual([]);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('tracks connection state', async () => {
      const driver = new ZebraRfidReader(
        'reader-zebra',
        '127.0.0.1',
        443,
        { prisma: mockPrisma as any, eventBus: mockEventBus as any, onTagsRead: vi.fn() },
        TEST_TENANT_ID,
      );

      expect((await driver.status()).status).toBe('DISCONNECTED');
      await driver.connect();
      expect((await driver.status()).status).toBe('CONNECTED');
      expect((await driver.status()).message).toContain('simulation fallback');
      await driver.disconnect();
      expect((await driver.status()).status).toBe('DISCONNECTED');
    });
  });

  describe('HardwareRfidService driver selection for impinj/zebra', () => {
    const originalDriver = process.env.RFID_DRIVER;

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      if (originalDriver === undefined) {
        delete process.env.RFID_DRIVER;
      } else {
        process.env.RFID_DRIVER = originalDriver;
      }
    });

    it('readTags works end-to-end with RFID_DRIVER=impinj', async () => {
      process.env.RFID_DRIVER = 'impinj';
      service = new HardwareRfidService(mockPrisma as any, mockEventBus as any);
      expect(service.getDriverName()).toBe('impinj');

      const pool = [1, 2, 3, 4].map((n) => ({
        id: `sn-${n}`,
        rfidTag: `EPC-${n}`,
        serialNumber: `SN-${n}`,
        status: 'AVAILABLE',
        product: { id: `p-${n}`, sku: `SK-${n}`, name: `Product ${n}` },
      }));
      mockPrisma.serialNumber.findMany.mockResolvedValue(pool);

      const promise = service.readTags(TEST_TENANT_ID, 'reader-1');
      await vi.runAllTimersAsync();
      const tags = await promise;

      expect(tags.length).toBeGreaterThanOrEqual(3);
      expect(tags.length).toBeLessThanOrEqual(6);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('readTags works end-to-end with RFID_DRIVER=zebra', async () => {
      process.env.RFID_DRIVER = 'zebra';
      service = new HardwareRfidService(mockPrisma as any, mockEventBus as any);
      expect(service.getDriverName()).toBe('zebra');

      const pool = [1, 2, 3, 4].map((n) => ({
        id: `sn-${n}`,
        rfidTag: `EPC-${n}`,
        serialNumber: `SN-${n}`,
        status: 'AVAILABLE',
        product: { id: `p-${n}`, sku: `SK-${n}`, name: `Product ${n}` },
      }));
      mockPrisma.serialNumber.findMany.mockResolvedValue(pool);

      const promise = service.readTags(TEST_TENANT_ID, 'reader-1');
      await vi.runAllTimersAsync();
      const tags = await promise;

      expect(tags.length).toBeGreaterThanOrEqual(3);
      expect(tags.length).toBeLessThanOrEqual(6);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });
});
