import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { EcommerceShopifyService } from '../ecommerce.shopify.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

describe('EcommerceShopifyService (Unit)', () => {
  let service: EcommerceShopifyService;
  let mockOrderService: any;
  let mockCatalogService: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = { ...createMockPrismaService(), catalogItem: { findFirst: vi.fn() } };
    mockOrderService = { createOrder: vi.fn().mockResolvedValue({ id: 'o-1' }) };
    mockCatalogService = {};
    service = new EcommerceShopifyService(mockPrisma, mockOrderService, mockCatalogService);
  });

  describe('verifyWebhookSignature', () => {
    it('returns true for valid HMAC-SHA256 base64 signature', () => {
      const secret = 'shopify-secret';
      const body = '{"id":123}';
      const sig = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

      expect(service.verifyWebhookSignature(body, sig, secret)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      expect(service.verifyWebhookSignature('body', 'bad-sig', 'secret')).toBe(false);
    });

    it('rejects tampered body', () => {
      const secret = 'shopify-secret';
      const body = '{"id":123}';
      const sig = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

      expect(service.verifyWebhookSignature('{"id":456}', sig, secret)).toBe(false);
    });
  });

  describe('processOrderWebhook', () => {
    it('creates an order from Shopify webhook payload', async () => {
      const payload = {
        id: 12345,
        order_number: 1001,
        financial_status: 'paid',
        total_price: '5000.00',
        currency: 'INR',
        line_items: [
          { id: 1, title: 'Gold Ring', price: '5000.00', quantity: 1, sku: 'GR-001' },
        ],
        shipping_address: { name: 'John Doe', address1: '123 St', city: 'Mumbai', province: 'MH', country_code: 'IN', zip: '400001' },
      };

      await service.processOrderWebhook(TEST_TENANT_ID, 'ch-1', payload as any);

      expect(mockOrderService.createOrder).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'system',
        expect.objectContaining({
          externalOrderId: '12345',
          status: 'CONFIRMED',
        }),
      );
    });

    it('maps pending financial_status to PENDING', async () => {
      const payload = {
        id: 999,
        financial_status: 'pending',
        total_price: '1000.00',
        line_items: [{ id: 1, title: 'Item', price: '1000.00', quantity: 1 }],
      };

      await service.processOrderWebhook(TEST_TENANT_ID, 'ch-1', payload as any);

      expect(mockOrderService.createOrder).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'system',
        expect.objectContaining({ status: 'PENDING' }),
      );
    });
  });

  describe('buildProductPayload', () => {
    it('builds Shopify product JSON from catalog item', () => {
      const catalogItem = {
        title: 'Diamond Ring',
        description: 'Beautiful ring',
        pricePaise: 500000,
        comparePricePaise: 600000,
        images: ['https://img.example.com/ring.jpg'],
        status: 'ACTIVE',
      };
      const product = {
        name: 'Diamond Ring',
        productType: 'FINISHED_GOODS',
        sku: 'DR-001',
        grossWeightMg: 5000,
      };

      const payload = service.buildProductPayload(catalogItem, product);

      expect(payload.title).toBe('Diamond Ring');
      expect(payload.variants[0].price).toBe('5000.00');
      expect(payload.variants[0].compare_at_price).toBe('6000.00');
      expect(payload.variants[0].sku).toBe('DR-001');
      expect(payload.images).toHaveLength(1);
      expect(payload.status).toBe('active');
    });

    it('sets status to draft for non-ACTIVE items', () => {
      const payload = service.buildProductPayload(
        { title: 'X', pricePaise: 100, status: 'DRAFT' },
        { name: 'X' },
      );
      expect(payload.status).toBe('draft');
    });
  });

  describe('buildFulfillmentPayload', () => {
    it('creates fulfillment with tracking info', () => {
      const result = service.buildFulfillmentPayload('TRK123', 'Delhivery', 'https://track.me', [101, 102]);

      expect(result.tracking_number).toBe('TRK123');
      expect(result.tracking_company).toBe('Delhivery');
      expect(result.line_items).toHaveLength(2);
    });
  });
});
