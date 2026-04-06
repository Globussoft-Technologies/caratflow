import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { DigitalGoldAlertService } from '../digital-gold.alert.service';

describe('DigitalGoldAlertService', () => {
  let service: DigitalGoldAlertService; let prisma: ReturnType<typeof createMockPrismaService>;
  let ratesService: any;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).goldPriceAlert = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() };
    ratesService = { getCurrentRate: vi.fn().mockResolvedValue({ ratePer10gPaise: 6000000 }) };
    service = new DigitalGoldAlertService(prisma as never, ratesService);
  });
  const mk = (o: Record<string,unknown> = {}) => ({ id: 'ga-1', customerId: 'c1', alertType: 'PRICE_BELOW', targetPricePer10gPaise: 5500000n, currentPricePer10gPaise: 6000000n, status: 'ACTIVE', triggeredAt: null, createdAt: new Date(), ...o });

  describe('createAlert', () => {
    it('should create PRICE_BELOW alert', async () => {
      (prisma as any).goldPriceAlert.count.mockResolvedValue(0);
      (prisma as any).goldPriceAlert.create.mockResolvedValue(mk());
      const r = await service.createAlert(tenantId, 'c1', { alertType: 'PRICE_BELOW', targetPricePer10gPaise: 5500000 } as any);
      expect(r.alertType).toBe('PRICE_BELOW');
    });
    it('should enforce max alerts per customer', async () => {
      (prisma as any).goldPriceAlert.count.mockResolvedValue(10);
      await expect(service.createAlert(tenantId, 'c1', { alertType: 'PRICE_BELOW', targetPricePer10gPaise: 5500000 } as any)).rejects.toThrow(BadRequestException);
    });
    it('should reject PRICE_BELOW target >= current', async () => {
      (prisma as any).goldPriceAlert.count.mockResolvedValue(0);
      await expect(service.createAlert(tenantId, 'c1', { alertType: 'PRICE_BELOW', targetPricePer10gPaise: 7000000 } as any)).rejects.toThrow(BadRequestException);
    });
    it('should reject PRICE_ABOVE target <= current', async () => {
      (prisma as any).goldPriceAlert.count.mockResolvedValue(0);
      await expect(service.createAlert(tenantId, 'c1', { alertType: 'PRICE_ABOVE', targetPricePer10gPaise: 5000000 } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelAlert', () => {
    it('should cancel active alert', async () => {
      (prisma as any).goldPriceAlert.findFirst.mockResolvedValue(mk());
      (prisma as any).goldPriceAlert.update.mockResolvedValue({});
      await service.cancelAlert(tenantId, 'c1', 'ga-1');
      expect((prisma as any).goldPriceAlert.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'CANCELLED' } }));
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).goldPriceAlert.findFirst.mockResolvedValue(null);
      await expect(service.cancelAlert(tenantId, 'c1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkAlerts', () => {
    it('should trigger alerts when price crosses threshold', async () => {
      ratesService.getCurrentRate.mockResolvedValue({ ratePer10gPaise: 5400000 });
      (prisma as any).goldPriceAlert.findMany.mockResolvedValueOnce([mk({ targetPricePer10gPaise: 5500000n })]).mockResolvedValueOnce([]);
      (prisma as any).goldPriceAlert.updateMany.mockResolvedValue({});
      const r = await service.checkAlerts();
      expect(r.triggered).toBe(1);
    });
    it('should return 0 when no alerts match', async () => {
      (prisma as any).goldPriceAlert.findMany.mockResolvedValue([]);
      const r = await service.checkAlerts();
      expect(r.triggered).toBe(0);
    });
  });

  describe('getCustomerAlerts', () => {
    it('should return customer alerts', async () => {
      (prisma as any).goldPriceAlert.findMany.mockResolvedValue([mk()]);
      const r = await service.getCustomerAlerts(tenantId, 'c1');
      expect(r).toHaveLength(1);
    });
  });
});
