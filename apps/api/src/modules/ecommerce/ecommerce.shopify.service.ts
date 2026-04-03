// ─── E-Commerce Shopify Integration Service ──────────────────
// Shopify-specific: product sync (create/update/delete), order
// import via webhook, inventory sync, fulfillment creation.
// Webhook verification with HMAC-SHA256.

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import type { ShopifyWebhookPayload } from '@caratflow/shared-types';
import { OnlineOrderStatus } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EcommerceService } from './ecommerce.service';
import { EcommerceCatalogService } from './ecommerce.catalog.service';

interface ShopifyProductPayload {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  variants: Array<{
    price: string;
    compare_at_price?: string;
    sku?: string;
    weight?: number;
    weight_unit?: string;
    inventory_quantity?: number;
  }>;
  images?: Array<{ src: string }>;
  status?: string;
}

interface ShopifyFulfillmentPayload {
  tracking_number?: string;
  tracking_company?: string;
  tracking_url?: string;
  line_items: Array<{
    id: number;
    quantity: number;
  }>;
}

@Injectable()
export class EcommerceShopifyService extends TenantAwareService {
  private readonly logger = new Logger(EcommerceShopifyService.name);

  constructor(
    prisma: PrismaService,
    private readonly orderService: EcommerceService,
    private readonly catalogService: EcommerceCatalogService,
  ) {
    super(prisma);
  }

  /**
   * Verify Shopify webhook HMAC-SHA256 signature.
   */
  verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    const hmac = createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');
    return hmac === signature;
  }

  /**
   * Process a Shopify order webhook (orders/create, orders/updated).
   */
  async processOrderWebhook(
    tenantId: string,
    channelId: string,
    payload: ShopifyWebhookPayload,
  ): Promise<void> {
    const externalOrderId = String(payload.id);
    const orderNumber = payload.order_number ? String(payload.order_number) : externalOrderId;

    // Map Shopify financial_status to our order status
    const statusMap: Record<string, OnlineOrderStatus> = {
      pending: OnlineOrderStatus.PENDING,
      paid: OnlineOrderStatus.CONFIRMED,
      partially_paid: OnlineOrderStatus.PENDING,
      refunded: OnlineOrderStatus.REFUNDED,
      partially_refunded: OnlineOrderStatus.CONFIRMED,
      voided: OnlineOrderStatus.CANCELLED,
    };

    const status = statusMap[payload.financial_status ?? 'pending'] ?? OnlineOrderStatus.PENDING;

    // Map fulfillment status
    if (payload.fulfillment_status === 'fulfilled') {
      // Order already shipped/delivered
    }

    // Parse line items
    const lineItems = (payload.line_items ?? []).map((li: Record<string, unknown>) => ({
      externalLineItemId: String(li.id ?? ''),
      title: (li.title as string) ?? 'Unknown Item',
      quantity: (li.quantity as number) ?? 1,
      unitPricePaise: Math.round(parseFloat(String(li.price ?? '0')) * 100),
      totalPaise: Math.round(parseFloat(String(li.price ?? '0')) * (li.quantity as number ?? 1) * 100),
      sku: (li.sku as string) ?? undefined,
      weightMg: li.grams ? (li.grams as number) * 1000 : undefined,
    }));

    const totalPricePaise = Math.round(parseFloat(payload.total_price ?? '0') * 100);

    // Parse addresses
    const shippingAddr = payload.shipping_address as Record<string, unknown> | undefined;
    const billingAddr = payload.billing_address as Record<string, unknown> | undefined;

    const mapAddress = (addr: Record<string, unknown> | undefined) => {
      if (!addr) return undefined;
      return {
        name: (addr.name as string) ?? '',
        line1: (addr.address1 as string) ?? '',
        line2: (addr.address2 as string) ?? undefined,
        city: (addr.city as string) ?? '',
        state: (addr.province as string) ?? '',
        country: (addr.country_code as string) ?? 'IN',
        postalCode: (addr.zip as string) ?? '',
        phone: (addr.phone as string) ?? undefined,
      };
    };

    await this.orderService.createOrder(tenantId, 'system', {
      channelId,
      externalOrderId,
      customerEmail: payload.email ?? undefined,
      customerName: shippingAddr ? (shippingAddr.name as string) : undefined,
      customerPhone: shippingAddr ? (shippingAddr.phone as string) : undefined,
      status,
      subtotalPaise: totalPricePaise,
      totalPaise: totalPricePaise,
      currencyCode: (payload.currency ?? 'INR').toUpperCase(),
      shippingAddress: mapAddress(shippingAddr),
      billingAddress: mapAddress(billingAddr),
      placedAt: new Date(),
      items: lineItems.length > 0 ? lineItems : [{
        title: `Shopify Order ${orderNumber}`,
        quantity: 1,
        unitPricePaise: totalPricePaise,
        totalPaise: totalPricePaise,
      }],
    });

    this.logger.log(`Processed Shopify order webhook: ${externalOrderId}`);
  }

  /**
   * Build a Shopify product payload from a catalog item.
   */
  buildProductPayload(catalogItem: Record<string, unknown>, product: Record<string, unknown>): ShopifyProductPayload {
    const pricePaise = Number(catalogItem.pricePaise ?? 0);
    const comparePricePaise = catalogItem.comparePricePaise ? Number(catalogItem.comparePricePaise) : undefined;
    const images = (catalogItem.images as string[]) ?? [];

    return {
      title: (catalogItem.title as string) ?? (product.name as string),
      body_html: (catalogItem.description as string) ?? (product.description as string) ?? '',
      product_type: (product.productType as string) ?? 'Jewelry',
      variants: [{
        price: (pricePaise / 100).toFixed(2),
        compare_at_price: comparePricePaise ? (comparePricePaise / 100).toFixed(2) : undefined,
        sku: (product.sku as string) ?? undefined,
        weight: product.grossWeightMg ? Number(product.grossWeightMg) / 1000 : undefined,
        weight_unit: 'g',
      }],
      images: images.map((src) => ({ src })),
      status: (catalogItem.status as string) === 'ACTIVE' ? 'active' : 'draft',
    };
  }

  /**
   * Build a Shopify fulfillment payload for an order.
   */
  buildFulfillmentPayload(
    trackingNumber: string,
    carrier: string,
    trackingUrl?: string,
    lineItemIds?: number[],
  ): ShopifyFulfillmentPayload {
    return {
      tracking_number: trackingNumber,
      tracking_company: carrier,
      tracking_url: trackingUrl,
      line_items: (lineItemIds ?? []).map((id) => ({ id, quantity: 1 })),
    };
  }

  /**
   * Sync inventory quantity to Shopify.
   * In production, this would call the Shopify Inventory Level API.
   */
  async syncInventoryToShopify(
    tenantId: string,
    channelId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    const catalogItem = await this.prisma.catalogItem.findFirst({
      where: { tenantId, channelId, productId, syncStatus: 'SYNCED' },
    });

    if (!catalogItem || !catalogItem.externalProductId) {
      this.logger.warn(`Cannot sync inventory: catalog item not synced for product ${productId}`);
      return;
    }

    // In production, call Shopify API:
    // POST /admin/api/2024-01/inventory_levels/set.json
    // { location_id, inventory_item_id, available: quantity }
    this.logger.log(
      `[Shopify] Sync inventory: product=${productId}, external=${catalogItem.externalProductId}, qty=${quantity}`,
    );
  }
}
