// ─── E-Commerce Shopify Integration Service ──────────────────
// Shopify-specific: product push, order pull, inventory sync,
// fulfillment creation, webhook verification (HMAC-SHA256).
//
// Tenant credentials are read from the platform `Setting` table:
//   shopify_shop_domain      e.g. "mystore" (no ".myshopify.com")
//   shopify_access_token     private app / custom app access token
//   shopify_api_version      (optional, default "2024-04")
//   shopify_location_id      (optional, for inventory level sets)
//
// Per-tenant last-sync timestamp:
//   shopify_last_order_sync_at_{channelId}   ISO string

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import type { ShopifyWebhookPayload } from '@caratflow/shared-types';
import { OnlineOrderStatus } from '@caratflow/shared-types';
import type { Prisma } from '@caratflow/db';
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

interface ShopifyCredentials {
  shop: string;
  accessToken: string;
  apiVersion: string;
  locationId?: string;
}

interface ShopifyApiResult<T = unknown> {
  status: number;
  body: T;
}

const DEFAULT_API_VERSION = '2024-04';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 300;

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
      discountPaise: 0,
      taxPaise: 0,
      shippingPaise: 0,
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

  // ─── Real Shopify Admin API calls ─────────────────────────────

  /**
   * Push a catalog item to Shopify. Creates if no externalProductId,
   * otherwise updates the existing Shopify product.
   */
  async syncProductToShopify(
    tenantId: string,
    channelId: string,
    productId: string,
  ): Promise<{ externalProductId: string; status: number }> {
    const catalogItem = await this.prisma.catalogItem.findFirst({
      where: { tenantId, channelId, productId },
    });
    if (!catalogItem) {
      throw new NotFoundException(`Catalog item not found for product ${productId}`);
    }
    const product = await this.prisma.product.findFirst({
      where: { tenantId, id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const creds = await this.loadCredentials(tenantId);
    const payload = {
      product: this.buildProductPayload(
        catalogItem as unknown as Record<string, unknown>,
        product as unknown as Record<string, unknown>,
      ),
    };

    let externalId: string;
    let status: number;
    if (catalogItem.externalProductId) {
      const res = await this.apiFetch<{ product: { id: number | string } }>(
        creds,
        'PUT',
        `/products/${catalogItem.externalProductId}.json`,
        payload,
      );
      externalId = String(res.body.product.id);
      status = res.status;
    } else {
      const res = await this.apiFetch<{ product: { id: number | string } }>(
        creds,
        'POST',
        `/products.json`,
        payload,
      );
      externalId = String(res.body.product.id);
      status = res.status;
    }

    await this.prisma.catalogItem.update({
      where: { id: catalogItem.id },
      data: {
        externalProductId: externalId,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        syncError: null,
      },
    });

    this.logger.log(
      `Shopify product sync ok: product=${productId} external=${externalId} status=${status}`,
    );
    return { externalProductId: externalId, status };
  }

  /**
   * Pull orders from Shopify that changed since the last sync, and
   * upsert them as OnlineOrder rows via the existing webhook path.
   * Returns the number of orders processed.
   */
  async pullOrdersFromShopify(
    tenantId: string,
    channelId: string,
  ): Promise<{ processed: number; since: string; until: string }> {
    const creds = await this.loadCredentials(tenantId);
    const lastSyncKey = `shopify_last_order_sync_at_${channelId}`;
    const lastSyncAt = await this.getSetting(tenantId, lastSyncKey);
    const since = typeof lastSyncAt === 'string' && lastSyncAt
      ? lastSyncAt
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const until = new Date().toISOString();

    const qs = new URLSearchParams({
      status: 'any',
      updated_at_min: since,
      limit: '100',
    });
    const res = await this.apiFetch<{ orders: ShopifyWebhookPayload[] }>(
      creds,
      'GET',
      `/orders.json?${qs.toString()}`,
    );

    const orders = Array.isArray(res.body?.orders) ? res.body.orders : [];
    let processed = 0;
    for (const order of orders) {
      try {
        await this.processOrderWebhook(tenantId, channelId, order);
        processed++;
      } catch (err) {
        this.logger.warn(
          `Failed to import Shopify order ${order?.id}: ${(err as Error).message}`,
        );
      }
    }

    await this.setSetting(tenantId, lastSyncKey, until);
    this.logger.log(
      `Shopify order pull ok: channel=${channelId} since=${since} processed=${processed}`,
    );
    return { processed, since, until };
  }

  /**
   * Sync inventory quantity to Shopify.
   * Uses POST /inventory_levels/set.json with the location id from
   * settings (shopify_location_id). Falls back to a no-op log if the
   * catalog item is not yet synced.
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
      this.logger.warn(
        `Cannot sync inventory: catalog item not synced for product ${productId}`,
      );
      return;
    }

    const creds = await this.loadCredentials(tenantId);
    if (!creds.locationId) {
      throw new BadRequestException(
        'Missing setting "shopify_location_id" — required for inventory sync',
      );
    }

    // Fetch the variant to get its inventory_item_id
    const prodRes = await this.apiFetch<{ product: { variants: Array<{ inventory_item_id: number | string }> } }>(
      creds,
      'GET',
      `/products/${catalogItem.externalProductId}.json`,
    );
    const variant = prodRes.body?.product?.variants?.[0];
    if (!variant?.inventory_item_id) {
      throw new Error(`Shopify product ${catalogItem.externalProductId} has no variant inventory_item_id`);
    }

    await this.apiFetch(
      creds,
      'POST',
      `/inventory_levels/set.json`,
      {
        location_id: Number(creds.locationId),
        inventory_item_id: Number(variant.inventory_item_id),
        available: quantity,
      },
    );

    this.logger.log(
      `Shopify inventory set: product=${productId} external=${catalogItem.externalProductId} qty=${quantity}`,
    );
  }

  // ─── Credentials + low-level HTTP ─────────────────────────────

  /**
   * Load Shopify credentials from the tenant's Settings. Throws a clear
   * error if any required setting is missing. Never logs token values.
   */
  private async loadCredentials(tenantId: string): Promise<ShopifyCredentials> {
    const keys = [
      'shopify_shop_domain',
      'shopify_access_token',
      'shopify_api_version',
      'shopify_location_id',
    ];
    const rows = await this.prisma.setting.findMany({
      where: { tenantId, settingKey: { in: keys } },
    });
    const map = new Map<string, unknown>();
    for (const r of rows) map.set(r.settingKey, this.unwrapValue(r.settingValue));

    const shop = map.get('shopify_shop_domain') as string | undefined;
    const accessToken = map.get('shopify_access_token') as string | undefined;
    const apiVersion = (map.get('shopify_api_version') as string | undefined) ?? DEFAULT_API_VERSION;
    const locationId = map.get('shopify_location_id') as string | undefined;

    if (!shop) {
      throw new BadRequestException(
        'Shopify not configured: missing setting "shopify_shop_domain"',
      );
    }
    if (!accessToken) {
      throw new BadRequestException(
        'Shopify not configured: missing setting "shopify_access_token"',
      );
    }

    return {
      // Accept either "mystore" or "mystore.myshopify.com"
      shop: shop.replace(/\.myshopify\.com$/i, ''),
      accessToken,
      apiVersion,
      locationId,
    };
  }

  private unwrapValue(value: unknown): unknown {
    if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>).value;
    }
    return value;
  }

  private async getSetting(tenantId: string, key: string): Promise<unknown> {
    const row = await this.prisma.setting.findUnique({
      where: { tenantId_settingKey: { tenantId, settingKey: key } },
    });
    return row ? this.unwrapValue(row.settingValue) : undefined;
  }

  private async setSetting(tenantId: string, key: string, value: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { tenantId_settingKey: { tenantId, settingKey: key } },
      create: {
        tenantId,
        settingKey: key,
        settingValue: value as unknown as Prisma.InputJsonValue,
        category: 'general',
      },
      update: {
        settingValue: value as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Make an authenticated request against Shopify's Admin REST API.
   * Retries 5xx / 429 up to MAX_RETRIES with exponential backoff.
   */
  private async apiFetch<T = unknown>(
    creds: ShopifyCredentials,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    pathWithQuery: string,
    jsonBody?: unknown,
  ): Promise<ShopifyApiResult<T>> {
    const url = `https://${creds.shop}.myshopify.com/admin/api/${creds.apiVersion}${pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`}`;
    const headers: Record<string, string> = {
      'X-Shopify-Access-Token': creds.accessToken,
      'Accept': 'application/json',
    };
    if (jsonBody !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let res: Response | undefined;
      try {
        res = await fetch(url, {
          method,
          headers,
          body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
        });
      } catch (err) {
        lastErr = err;
      }

      if (res) {
        const isRetryable = res.status === 429 || res.status >= 500;
        if (!isRetryable) {
          if (res.status >= 200 && res.status < 300) {
            const body = (await res.json().catch(() => ({}))) as T;
            return { status: res.status, body };
          }
          const text = await res.text().catch(() => '');
          throw new Error(`Shopify ${method} ${pathWithQuery} → ${res.status}: ${text}`);
        }
        lastErr = new Error(`Shopify ${method} ${pathWithQuery} → ${res.status} (retryable)`);
      }

      if (attempt < MAX_RETRIES - 1) {
        await this.sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new Error(`Shopify ${method} ${pathWithQuery}: request failed`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
