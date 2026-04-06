import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EcommerceShippingService } from '../ecommerce.shipping.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    onlineOrder: { findFirst: vi.fn(), update: vi.fn() },
    shipment: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(),
    },
  };
}

describe('EcommerceShippingService (Unit)', () => {
  let service: EcommerceShippingService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  const shipment = {
    id: 'sh-1', tenantId: TEST_TENANT_ID, orderId: 'o-1',
    shipmentNumber: 'SH/2604/0001', carrier: 'Delhivery',
    trackingNumber: 'TRK123', trackingUrl: null, status: 'LABEL_CREATED',
    estimatedDeliveryDate: null, actualDeliveryDate: null, weightGrams: 50,
    shippingCostPaise: 15000n, labelUrl: null,
    createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new EcommerceShippingService(mockPrisma as any);
  });

  describe('createShipment', () => {
    it('creates a shipment and updates CONFIRMED order to PROCESSING', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValue({ id: 'o-1', status: 'CONFIRMED', orderNumber: 'ON/1' });
      mockPrisma.shipment.count.mockResolvedValue(0);
      mockPrisma.shipment.create.mockResolvedValue(shipment);
      mockPrisma.onlineOrder.update.mockResolvedValue({});

      const result = await service.createShipment(TEST_TENANT_ID, TEST_USER_ID, {
        orderId: 'o-1', carrier: 'Delhivery',
      });

      expect(result.shipmentNumber).toBeDefined();
      expect(mockPrisma.onlineOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PROCESSING' }) }),
      );
    });

    it('throws BadRequestException for CANCELLED order', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValue({ id: 'o-1', status: 'CANCELLED' });
      await expect(
        service.createShipment(TEST_TENANT_ID, TEST_USER_ID, { orderId: 'o-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for missing order', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValue(null);
      await expect(
        service.createShipment(TEST_TENANT_ID, TEST_USER_ID, { orderId: 'bad' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTracking', () => {
    it('updates order to DELIVERED when shipment is delivered', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({ ...shipment, orderId: 'o-1' });
      mockPrisma.shipment.update.mockResolvedValue({ ...shipment, status: 'DELIVERED' });
      mockPrisma.onlineOrder.update.mockResolvedValue({});

      await service.updateTracking(TEST_TENANT_ID, TEST_USER_ID, {
        shipmentId: 'sh-1', status: 'DELIVERED' as any,
      });

      expect(mockPrisma.onlineOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DELIVERED', deliveredAt: expect.any(Date) }),
        }),
      );
    });

    it('updates order to SHIPPED on PICKED_UP', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({ ...shipment, orderId: 'o-1' });
      mockPrisma.shipment.update.mockResolvedValue({ ...shipment, status: 'PICKED_UP' });
      mockPrisma.onlineOrder.update.mockResolvedValue({});

      await service.updateTracking(TEST_TENANT_ID, TEST_USER_ID, {
        shipmentId: 'sh-1', status: 'PICKED_UP' as any,
      });

      expect(mockPrisma.onlineOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SHIPPED' }),
        }),
      );
    });
  });

  describe('generateLabel', () => {
    it('sets carrier and label URL', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({ ...shipment, order: {} });
      mockPrisma.shipment.update.mockResolvedValue({
        ...shipment, carrier: 'Shiprocket', labelUrl: 'https://labels.example.com/SH.pdf',
      });

      const result = await service.generateLabel(TEST_TENANT_ID, 'sh-1', 'Shiprocket');
      expect(result.labelUrl).toContain('labels.example.com');
    });
  });

  describe('getShipmentsByOrder', () => {
    it('returns all shipments for an order', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([shipment]);
      const result = await service.getShipmentsByOrder(TEST_TENANT_ID, 'o-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getShipment', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue(null);
      await expect(service.getShipment(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });
});
