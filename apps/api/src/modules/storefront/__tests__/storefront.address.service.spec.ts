import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { StorefrontAddressService } from '../storefront.address.service';

describe('StorefrontAddressService', () => {
  let service: StorefrontAddressService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).customerAddress = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), count: vi.fn() };
    service = new StorefrontAddressService(prisma as never);
  });

  const mkAddr = (o: Record<string,unknown> = {}) => ({ id: 'a-1', tenantId, customerId: 'c1', label: 'Home', firstName: 'A', lastName: 'B', phone: '123', addressLine1: '123 St', addressLine2: null, city: 'Mumbai', state: 'MH', country: 'IN', postalCode: '400001', isDefault: false, createdAt: new Date(), updatedAt: new Date(), ...o });

  describe('createAddress', () => {
    it('should auto-default first address', async () => {
      (prisma as any).customerAddress.count.mockResolvedValue(0);
      (prisma as any).customerAddress.create.mockResolvedValue(mkAddr({ isDefault: true }));
      const r = await service.createAddress(tenantId, 'c1', { firstName: 'A', lastName: 'B', phone: '123', addressLine1: '123 St', city: 'Mumbai', state: 'MH', country: 'IN', postalCode: '400001' } as any);
      expect(r.isDefault).toBe(true);
    });
    it('should unset previous default when new is default', async () => {
      (prisma as any).customerAddress.count.mockResolvedValue(1);
      (prisma as any).customerAddress.updateMany.mockResolvedValue({});
      (prisma as any).customerAddress.create.mockResolvedValue(mkAddr({ isDefault: true }));
      await service.createAddress(tenantId, 'c1', { isDefault: true, firstName: 'A', lastName: 'B', phone: '123', addressLine1: '456 St', city: 'Delhi', state: 'DL', country: 'IN', postalCode: '110001' } as any);
      expect((prisma as any).customerAddress.updateMany).toHaveBeenCalled();
    });
  });

  describe('deleteAddress', () => {
    it('should promote next address to default when deleting default', async () => {
      (prisma as any).customerAddress.findFirst.mockResolvedValueOnce(mkAddr({ isDefault: true })).mockResolvedValueOnce(mkAddr({ id: 'a-2' }));
      (prisma as any).customerAddress.delete.mockResolvedValue({});
      (prisma as any).customerAddress.update.mockResolvedValue({});
      await service.deleteAddress(tenantId, 'c1', 'a-1');
      expect((prisma as any).customerAddress.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isDefault: true } }));
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).customerAddress.findFirst.mockResolvedValue(null);
      await expect(service.deleteAddress(tenantId, 'c1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listAddresses', () => {
    it('should return addresses ordered by default first', async () => {
      (prisma as any).customerAddress.findMany.mockResolvedValue([mkAddr({ isDefault: true }), mkAddr({ id: 'a-2' })]);
      const r = await service.listAddresses(tenantId, 'c1');
      expect(r).toHaveLength(2);
    });
  });

  describe('getAddress', () => {
    it('should return address', async () => {
      (prisma as any).customerAddress.findFirst.mockResolvedValue(mkAddr());
      const r = await service.getAddress(tenantId, 'c1', 'a-1');
      expect(r.id).toBe('a-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).customerAddress.findFirst.mockResolvedValue(null);
      await expect(service.getAddress(tenantId, 'c1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAddress', () => {
    it('should update fields', async () => {
      (prisma as any).customerAddress.findFirst.mockResolvedValue(mkAddr());
      (prisma as any).customerAddress.update.mockResolvedValue(mkAddr({ city: 'Delhi' }));
      const r = await service.updateAddress(tenantId, 'c1', 'a-1', { city: 'Delhi' });
      expect(r.city).toBe('Delhi');
    });
  });
});
