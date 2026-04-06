// ─── Storefront Wishlist Service ───────────────────────────────
// Customer wishlists with price alert support.

import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import type { WishlistResponse, WishlistItemResponse } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { StorefrontPricingService } from './storefront.pricing.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorefrontWishlistService extends TenantAwareService {
  private readonly logger = new Logger(StorefrontWishlistService.name);

  constructor(
    prisma: PrismaService,
    private readonly pricingService: StorefrontPricingService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /**
   * Add a product to the customer's wishlist.
   */
  async add(tenantId: string, customerId: string, productId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.wishlist.findUnique({
      where: { tenantId_customerId_productId: { tenantId, customerId, productId } },
    });
    if (existing) {
      throw new ConflictException('Product already in wishlist');
    }

    // Calculate current price for priceAtAddPaise
    const pricing = await this.pricingService.calculateLiveProductPrice(tenantId, {
      productType: product.productType,
      metalPurity: product.metalPurity,
      metalWeightMg: product.metalWeightMg,
      makingCharges: product.makingCharges,
      wastagePercent: product.wastagePercent,
      sellingPricePaise: product.sellingPricePaise,
    });

    await this.prisma.wishlist.create({
      data: {
        id: uuidv4(),
        tenantId,
        customerId,
        productId,
        priceAtAddPaise: BigInt(pricing.totalPricePaise),
      },
    });
  }

  /**
   * Remove a product from the wishlist.
   */
  async remove(tenantId: string, customerId: string, productId: string): Promise<void> {
    const item = await this.prisma.wishlist.findUnique({
      where: { tenantId_customerId_productId: { tenantId, customerId, productId } },
    });
    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.prisma.wishlist.delete({ where: { id: item.id } });
  }

  /**
   * Get the full wishlist for a customer with current prices and stock status.
   */
  async getWishlist(tenantId: string, customerId: string): Promise<WishlistResponse> {
    const wishlistItems = await this.prisma.wishlist.findMany({
      where: { tenantId, customerId },
      orderBy: { addedAt: 'desc' },
    });

    if (wishlistItems.length === 0) {
      return { items: [], total: 0 };
    }

    const productIds = wishlistItems.map((w) => w.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      include: {
        stockItems: {
          select: { quantityOnHand: true, quantityReserved: true },
        },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const items: WishlistItemResponse[] = [];
    for (const wItem of wishlistItems) {
      const product = productMap.get(wItem.productId);
      if (!product) continue;

      const pricing = await this.pricingService.calculateLiveProductPrice(tenantId, {
        productType: product.productType,
        metalPurity: product.metalPurity,
        metalWeightMg: product.metalWeightMg,
        makingCharges: product.makingCharges,
        wastagePercent: product.wastagePercent,
        sellingPricePaise: product.sellingPricePaise,
      });

      const totalOnHand = product.stockItems.reduce((s, si) => s + si.quantityOnHand, 0);
      const totalReserved = product.stockItems.reduce((s, si) => s + si.quantityReserved, 0);
      const available = Math.max(0, totalOnHand - totalReserved);

      let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'OUT_OF_STOCK';
      if (available > 3) stockStatus = 'IN_STOCK';
      else if (available > 0) stockStatus = 'LOW_STOCK';

      const images = product.images as unknown;
      const firstImage = Array.isArray(images) && images.length > 0 ? (images[0] as string) : null;

      items.push({
        id: wItem.id,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productImage: firstImage,
        productType: product.productType,
        currentPricePaise: pricing.totalPricePaise,
        currencyCode: product.currencyCode,
        stockStatus,
        priceAlertEnabled: wItem.priceAlertEnabled,
        priceAlertThresholdPaise: wItem.priceAlertThresholdPaise
          ? Number(wItem.priceAlertThresholdPaise)
          : null,
        addedAt: wItem.addedAt,
      });
    }

    return { items, total: items.length };
  }

  /**
   * Enable a price alert for a wishlist item.
   */
  async enablePriceAlert(
    tenantId: string,
    customerId: string,
    productId: string,
    targetPricePaise: number,
  ): Promise<void> {
    const item = await this.prisma.wishlist.findUnique({
      where: { tenantId_customerId_productId: { tenantId, customerId, productId } },
    });
    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.prisma.wishlist.update({
      where: { id: item.id },
      data: {
        priceAlertEnabled: true,
        priceAlertThresholdPaise: BigInt(targetPricePaise),
      },
    });

    // Also create a PriceAlert record
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) return;

    const currentPricing = await this.pricingService.calculateLiveProductPrice(tenantId, {
      productType: product.productType,
      metalPurity: product.metalPurity,
      metalWeightMg: product.metalWeightMg,
      makingCharges: product.makingCharges,
      wastagePercent: product.wastagePercent,
      sellingPricePaise: product.sellingPricePaise,
    });

    // Upsert price alert
    const existingAlert = await this.prisma.priceAlert.findFirst({
      where: { tenantId, customerId, productId, status: 'ACTIVE' },
    });

    if (existingAlert) {
      await this.prisma.priceAlert.update({
        where: { id: existingAlert.id },
        data: {
          targetPricePaise: BigInt(targetPricePaise),
          currentPricePaise: BigInt(currentPricing.totalPricePaise),
        },
      });
    } else {
      await this.prisma.priceAlert.create({
        data: {
          id: uuidv4(),
          tenantId,
          customerId,
          productId,
          targetPricePaise: BigInt(targetPricePaise),
          currentPricePaise: BigInt(currentPricing.totalPricePaise),
          status: 'ACTIVE',
        },
      });
    }
  }

  /**
   * Check all active price alerts and trigger notifications for products
   * whose price has dropped below the target. Designed to run as BullMQ cron.
   */
  async checkPriceAlerts(tenantId: string): Promise<void> {
    const activeAlerts = await this.prisma.priceAlert.findMany({
      where: { tenantId, status: 'ACTIVE' },
    });

    if (activeAlerts.length === 0) return;

    // Group by product to avoid re-calculating the same product
    const productIds = [...new Set(activeAlerts.map((a) => a.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const priceCache = new Map<string, number>();

    for (const alert of activeAlerts) {
      let currentPrice = priceCache.get(alert.productId);
      if (currentPrice === undefined) {
        const product = productMap.get(alert.productId);
        if (!product) continue;

        const pricing = await this.pricingService.calculateLiveProductPrice(tenantId, {
          productType: product.productType,
          metalPurity: product.metalPurity,
          metalWeightMg: product.metalWeightMg,
          makingCharges: product.makingCharges,
          wastagePercent: product.wastagePercent,
          sellingPricePaise: product.sellingPricePaise,
        });
        currentPrice = pricing.totalPricePaise;
        priceCache.set(alert.productId, currentPrice);
      }

      // Update current price
      await this.prisma.priceAlert.update({
        where: { id: alert.id },
        data: { currentPricePaise: BigInt(currentPrice) },
      });

      // Check if price dropped below target
      if (currentPrice <= Number(alert.targetPricePaise)) {
        await this.prisma.priceAlert.update({
          where: { id: alert.id },
          data: { status: 'TRIGGERED', triggeredAt: new Date() },
        });

        // Publish event for notification handling
        await this.eventBus.publish({
          id: uuidv4(),
          tenantId,
          userId: alert.customerId,
          timestamp: new Date().toISOString(),
          type: 'b2c.price_alert.triggered',
          payload: {
            customerId: alert.customerId,
            productId: alert.productId,
            thresholdPaise: Number(alert.targetPricePaise),
            currentPricePaise: currentPrice,
          },
        });

        this.logger.log(
          `Price alert triggered: customer=${alert.customerId}, product=${alert.productId}, price=${currentPrice}`,
        );
      }
    }
  }
}
