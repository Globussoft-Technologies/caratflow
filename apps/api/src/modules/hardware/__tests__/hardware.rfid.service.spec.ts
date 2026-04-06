import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { HardwareRfidService } from '../hardware.rfid.service';
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

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new HardwareRfidService(mockPrisma as any);
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
});
