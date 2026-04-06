import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('bcrypt', () => ({ compare: vi.fn(), hash: vi.fn().mockResolvedValue('hashed') }));
import { CustomerPortalProfileService } from '../customer-portal.profile.service';

describe('CustomerPortalProfileService', () => {
  let service: CustomerPortalProfileService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    prisma.customer.findFirst = vi.fn() as any;
    service = new CustomerPortalProfileService(prisma as never);
  });

  describe('getProfile', () => {
    it('should return profile data', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'c1', firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '123', alternatePhone: null, address: null, city: 'Mumbai', state: 'MH', country: 'IN', postalCode: '400001', customerType: 'RETAIL', panNumber: null, aadhaarNumber: null, gstinNumber: null, dateOfBirth: null, anniversary: null, loyaltyPoints: 100, loyaltyTier: 'SILVER', createdAt: new Date(), customerAuth: null } as any);
      const r = await service.getProfile(tenantId, 'c1');
      expect(r.firstName).toBe('A');
    });
    it('should throw NotFoundException', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.getProfile(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
