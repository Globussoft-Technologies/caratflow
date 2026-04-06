import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { EcommercePaymentService } from '../ecommerce.payment.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    paymentGateway: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(),
    },
    onlineOrder: { findFirst: vi.fn() },
    onlinePayment: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(),
    },
  };
}

describe('EcommercePaymentService (Unit)', () => {
  let service: EcommercePaymentService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  const gateway = {
    id: 'gw-1', tenantId: TEST_TENANT_ID, name: 'Razorpay',
    gatewayType: 'RAZORPAY', isActive: true, isDefault: true,
    supportedMethods: null, settings: null,
    createdAt: new Date(), updatedAt: new Date(),
  };

  const payment = {
    id: 'pay-1', tenantId: TEST_TENANT_ID, orderId: 'o-1', gatewayId: 'gw-1',
    externalPaymentId: null, method: 'UPI', amountPaise: 100000n,
    currencyCode: 'INR', status: 'INITIATED',
    gatewayResponse: null, initiatedAt: new Date(),
    completedAt: null, refundedAt: null, refundAmountPaise: null,
    createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new EcommercePaymentService(mockPrisma as any);
  });

  describe('createGateway', () => {
    it('creates a payment gateway', async () => {
      mockPrisma.paymentGateway.create.mockResolvedValue(gateway);

      const result = await service.createGateway(TEST_TENANT_ID, TEST_USER_ID, {
        name: 'Razorpay', gatewayType: 'RAZORPAY' as any, isDefault: false,
      });

      expect(result.name).toBe('Razorpay');
    });

    it('unsets other defaults when creating a default gateway', async () => {
      mockPrisma.paymentGateway.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.paymentGateway.create.mockResolvedValue(gateway);

      await service.createGateway(TEST_TENANT_ID, TEST_USER_ID, {
        name: 'Stripe', gatewayType: 'STRIPE' as any, isDefault: true,
      });

      expect(mockPrisma.paymentGateway.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDefault: false } }),
      );
    });
  });

  describe('getGateway', () => {
    it('returns gateway when found', async () => {
      mockPrisma.paymentGateway.findFirst.mockResolvedValue(gateway);
      const result = await service.getGateway(TEST_TENANT_ID, 'gw-1');
      expect(result.id).toBe('gw-1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.paymentGateway.findFirst.mockResolvedValue(null);
      await expect(service.getGateway(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('initiatePayment', () => {
    it('creates a payment in INITIATED status', async () => {
      mockPrisma.paymentGateway.findFirst.mockResolvedValue(gateway);
      mockPrisma.onlineOrder.findFirst.mockResolvedValue({ id: 'o-1' });
      mockPrisma.onlinePayment.create.mockResolvedValue(payment);

      const result = await service.initiatePayment(TEST_TENANT_ID, TEST_USER_ID, {
        orderId: 'o-1', gatewayId: 'gw-1', amountPaise: 100000,
      });

      expect(result.status).toBe('INITIATED');
    });

    it('throws NotFoundException for missing gateway', async () => {
      mockPrisma.paymentGateway.findFirst.mockResolvedValue(null);
      await expect(
        service.initiatePayment(TEST_TENANT_ID, TEST_USER_ID, {
          orderId: 'o-1', gatewayId: 'bad', amountPaise: 100000,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('capturePayment', () => {
    it('marks payment as CAPTURED', async () => {
      mockPrisma.onlinePayment.findFirst.mockResolvedValue(payment);
      mockPrisma.onlinePayment.update.mockResolvedValue({ ...payment, status: 'CAPTURED' });

      const result = await service.capturePayment(TEST_TENANT_ID, 'pay-1', 'ext-pay-1');
      expect(result.status).toBe('CAPTURED');
    });
  });

  describe('refundPayment', () => {
    it('fully refunds a captured payment', async () => {
      mockPrisma.onlinePayment.findFirst.mockResolvedValue({ ...payment, status: 'CAPTURED' });
      mockPrisma.onlinePayment.update.mockResolvedValue({ ...payment, status: 'REFUNDED' });

      const result = await service.refundPayment(TEST_TENANT_ID, 'pay-1');
      expect(result.status).toBe('REFUNDED');
    });

    it('partially refunds when amount is less', async () => {
      mockPrisma.onlinePayment.findFirst.mockResolvedValue({ ...payment, status: 'CAPTURED' });
      mockPrisma.onlinePayment.update.mockResolvedValue({ ...payment, status: 'PARTIALLY_REFUNDED' });

      const result = await service.refundPayment(TEST_TENANT_ID, 'pay-1', 50000);
      expect(result.status).toBe('PARTIALLY_REFUNDED');
    });

    it('throws BadRequestException when payment is not captured', async () => {
      mockPrisma.onlinePayment.findFirst.mockResolvedValue({ ...payment, status: 'INITIATED' });
      await expect(service.refundPayment(TEST_TENANT_ID, 'pay-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyRazorpaySignature', () => {
    it('verifies valid HMAC-SHA256 signature', () => {
      const secret = 'test-secret';
      const body = '{"event":"payment.captured"}';
      const sig = createHmac('sha256', secret).update(body).digest('hex');

      expect(service.verifyRazorpaySignature(body, sig, secret)).toBe(true);
    });

    it('rejects invalid signature', () => {
      expect(service.verifyRazorpaySignature('body', 'bad-sig', 'secret')).toBe(false);
    });
  });

  describe('verifyStripeSignature', () => {
    it('verifies valid Stripe webhook signature', () => {
      const secret = 'whsec_test';
      const body = '{"type":"payment_intent.succeeded"}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = `${timestamp}.${body}`;
      const sig = createHmac('sha256', secret).update(payload).digest('hex');
      const sigHeader = `t=${timestamp},v1=${sig}`;

      expect(service.verifyStripeSignature(body, sigHeader, secret)).toBe(true);
    });

    it('rejects invalid Stripe signature', () => {
      expect(service.verifyStripeSignature('body', 't=123,v1=bad', 'secret')).toBe(false);
    });
  });

  describe('listGateways', () => {
    it('returns all gateways for tenant', async () => {
      mockPrisma.paymentGateway.findMany.mockResolvedValue([gateway]);
      const result = await service.listGateways(TEST_TENANT_ID);
      expect(result).toHaveLength(1);
    });
  });
});
