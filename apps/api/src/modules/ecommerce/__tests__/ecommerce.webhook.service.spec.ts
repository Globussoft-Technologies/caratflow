import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EcommerceWebhookService } from '../ecommerce.webhook.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    webhookLog: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(),
    },
  };
}

describe('EcommerceWebhookService (Unit)', () => {
  let service: EcommerceWebhookService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  let mockShopifyService: any;
  let mockPaymentService: any;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    mockShopifyService = { processOrderWebhook: vi.fn().mockResolvedValue(undefined) };
    mockPaymentService = {
      processRazorpayWebhook: vi.fn().mockResolvedValue(undefined),
      processStripeWebhook: vi.fn().mockResolvedValue(undefined),
    };
    service = new EcommerceWebhookService(mockPrisma as any, mockShopifyService, mockPaymentService);
  });

  describe('handleWebhook', () => {
    it('logs the webhook and routes to appropriate handler', async () => {
      mockPrisma.webhookLog.create.mockResolvedValue({ id: 'wl-1' });
      mockPrisma.webhookLog.update.mockResolvedValue({});

      const result = await service.handleWebhook(
        TEST_TENANT_ID, 'shopify', 'orders/create', { id: 123 }, 'ch-1',
      );

      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.webhookLog.create).toHaveBeenCalledOnce();
      expect(mockShopifyService.processOrderWebhook).toHaveBeenCalledOnce();
    });

    it('routes razorpay webhooks to payment service', async () => {
      mockPrisma.webhookLog.create.mockResolvedValue({ id: 'wl-1' });
      mockPrisma.webhookLog.update.mockResolvedValue({});

      await service.handleWebhook(TEST_TENANT_ID, 'razorpay', 'payment.captured', { event: 'payment.captured' });

      expect(mockPaymentService.processRazorpayWebhook).toHaveBeenCalledOnce();
    });

    it('routes stripe webhooks to payment service', async () => {
      mockPrisma.webhookLog.create.mockResolvedValue({ id: 'wl-1' });
      mockPrisma.webhookLog.update.mockResolvedValue({});

      await service.handleWebhook(TEST_TENANT_ID, 'stripe', 'payment_intent.succeeded', { type: 'payment_intent.succeeded' });

      expect(mockPaymentService.processStripeWebhook).toHaveBeenCalledOnce();
    });

    it('marks webhook as FAILED when handler throws', async () => {
      mockPrisma.webhookLog.create.mockResolvedValue({ id: 'wl-1' });
      mockPrisma.webhookLog.update.mockResolvedValue({});
      mockShopifyService.processOrderWebhook.mockRejectedValue(new Error('API error'));

      const result = await service.handleWebhook(
        TEST_TENANT_ID, 'shopify', 'orders/create', {}, 'ch-1',
      );

      expect(result.status).toBe('FAILED');
    });
  });

  describe('retryWebhook', () => {
    it('retries a failed webhook', async () => {
      mockPrisma.webhookLog.findFirst.mockResolvedValue({
        id: 'wl-1', source: 'razorpay', eventType: 'payment.captured',
        payload: { event: 'payment.captured' }, channelId: null, gatewayId: 'gw-1',
      });
      mockPrisma.webhookLog.create.mockResolvedValue({ id: 'wl-2' });
      mockPrisma.webhookLog.update.mockResolvedValue({});

      const result = await service.retryWebhook(TEST_TENANT_ID, 'wl-1');
      expect(result.status).toBe('PROCESSED');
    });

    it('throws when webhook log not found', async () => {
      mockPrisma.webhookLog.findFirst.mockResolvedValue(null);
      await expect(service.retryWebhook(TEST_TENANT_ID, 'bad')).rejects.toThrow();
    });
  });

  describe('listWebhookLogs', () => {
    it('returns paginated webhook logs', async () => {
      mockPrisma.webhookLog.findMany.mockResolvedValue([{
        id: 'wl-1', tenantId: TEST_TENANT_ID, channelId: null, gatewayId: null,
        source: 'shopify', eventType: 'orders/create', payload: {},
        status: 'PROCESSED', processedAt: new Date(), error: null,
        createdAt: new Date(), updatedAt: new Date(),
      }]);
      mockPrisma.webhookLog.count.mockResolvedValue(1);

      const result = await service.listWebhookLogs(TEST_TENANT_ID, {}, { page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
