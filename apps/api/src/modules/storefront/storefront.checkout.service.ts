// ─── Storefront Checkout Service ───────────────────────────────
// Checkout flow: validate stock, lock prices, create OnlineOrder,
// initiate payment, complete/cancel.

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import type { CheckoutInput, OrderResponse } from '@caratflow/shared-types';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { StorefrontPricingService } from './storefront.pricing.service';
import { StorefrontCouponService } from './storefront.coupon.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorefrontCheckoutService extends TenantAwareService {
  private readonly logger = new Logger(StorefrontCheckoutService.name);

  constructor(
    prisma: PrismaService,
    private readonly pricingService: StorefrontPricingService,
    private readonly couponService: StorefrontCouponService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /**
   * Initiate checkout: validate stock, lock prices, create OnlineOrder + payment.
   */
  async initiateCheckout(
    tenantId: string,
    customerId: string,
    input: CheckoutInput,
  ): Promise<OrderResponse> {
    // 1. Validate cart exists and has items
    const cart = await this.prisma.cart.findFirst({
      where: { id: input.cartId, tenantId },
      include: { items: true },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty or not found');
    }

    // 2. Validate address
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: input.addressId, tenantId, customerId },
    });
    if (!address) {
      throw new NotFoundException('Shipping address not found');
    }

    // 3. Validate stock availability for all items
    const productIds = cart.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      include: {
        stockItems: {
          select: { quantityOnHand: true, quantityReserved: true },
        },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of cart.items) {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) {
        throw new BadRequestException(`Product ${item.productId} is no longer available`);
      }
      const available = product.stockItems.reduce(
        (sum, si) => sum + si.quantityOnHand - si.quantityReserved,
        0,
      );
      if (item.quantity > available) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${available}, requested: ${item.quantity}`,
        );
      }
    }

    // 4. Lock metal prices on cart items
    await this.pricingService.lockPriceForCheckout(tenantId, cart.id);

    // Re-fetch cart items with locked prices
    const lockedItems = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id, tenantId },
    });

    // 5. Calculate final totals
    const cartItemsWithProducts = lockedItems.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        metalRatePaiseLocked: item.metalRatePaiseLocked,
        product: {
          productType: product.productType,
          metalPurity: product.metalPurity,
          metalWeightMg: product.metalWeightMg,
          makingCharges: product.makingCharges,
          wastagePercent: product.wastagePercent,
          sellingPricePaise: product.sellingPricePaise,
        },
      };
    });

    // Apply coupon if provided
    let couponDiscountPaise = 0;
    const couponCode = input.couponCode ?? cart.couponCode;
    if (couponCode) {
      // Quick subtotal for coupon validation
      const quickPricing = await this.pricingService.calculateCartTotal(
        tenantId,
        cartItemsWithProducts,
        0,
      );
      const validation = await this.couponService.validateCoupon(
        tenantId,
        couponCode,
        quickPricing.subtotalPaise,
        customerId,
      );
      if (validation.valid) {
        couponDiscountPaise = validation.discountPaise;
      }
    }

    const pricing = await this.pricingService.calculateCartTotal(
      tenantId,
      cartItemsWithProducts,
      couponDiscountPaise,
    );

    // 6. Find or create a WEBSITE sales channel
    let channel = await this.prisma.salesChannel.findFirst({
      where: { tenantId, channelType: 'WEBSITE', isActive: true },
    });
    if (!channel) {
      channel = await this.prisma.salesChannel.create({
        data: {
          id: uuidv4(),
          tenantId,
          name: 'B2C Storefront',
          channelType: 'WEBSITE',
          isActive: true,
        },
      });
    }

    // 7. Generate order number
    const orderNumber = await this.generateOrderNumber(tenantId);

    // 8. Create OnlineOrder + items in a transaction
    const orderId = uuidv4();
    const shippingAddress = {
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      line1: address.addressLine1,
      line2: address.addressLine2,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.onlineOrder.create({
        data: {
          id: orderId,
          tenantId,
          orderNumber,
          channelId: channel!.id,
          customerId,
          status: 'PENDING',
          subtotalPaise: BigInt(pricing.subtotalPaise),
          shippingPaise: 0n,
          taxPaise: BigInt(pricing.taxPaise),
          discountPaise: BigInt(pricing.discountPaise),
          totalPaise: BigInt(pricing.totalPaise),
          currencyCode: cart.currencyCode,
          shippingAddress,
          placedAt: new Date(),
        },
      });

      // Create order items
      for (const item of lockedItems) {
        const product = productMap.get(item.productId)!;
        const itemPricing = pricing.itemPrices.find((ip) => ip.cartItemId === item.id);
        const unitPrice = itemPricing?.unitPricePaise ?? 0;
        const lineTotal = itemPricing?.lineTotalPaise ?? 0;

        await tx.onlineOrderItem.create({
          data: {
            id: uuidv4(),
            tenantId,
            orderId,
            productId: item.productId,
            title: product.name,
            quantity: item.quantity,
            unitPricePaise: BigInt(unitPrice),
            totalPaise: BigInt(lineTotal),
            sku: product.sku,
            weightMg: product.grossWeightMg,
          },
        });
      }

      // Create initial payment record
      const defaultGateway = await tx.paymentGateway.findFirst({
        where: { tenantId, isActive: true, isDefault: true },
      });

      if (defaultGateway) {
        await tx.onlinePayment.create({
          data: {
            id: uuidv4(),
            tenantId,
            orderId,
            gatewayId: defaultGateway.id,
            method: input.paymentMethod,
            amountPaise: BigInt(pricing.totalPaise),
            currencyCode: cart.currencyCode,
            status: 'INITIATED',
            initiatedAt: new Date(),
          },
        });
      }
    });

    // 9. Publish order placed event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'storefront.order.placed',
      payload: {
        orderId,
        customerId,
        totalPaise: pricing.totalPaise,
        itemCount: lockedItems.length,
      },
    });

    return this.getOrderResponse(tenantId, orderId);
  }

  /**
   * Complete checkout after payment confirmation.
   * Marks order as CONFIRMED, decrements stock, clears cart.
   */
  async completeCheckout(
    tenantId: string,
    customerId: string,
    orderId: string,
    paymentConfirmation: { externalPaymentId: string; gatewayResponse?: Record<string, unknown> },
  ): Promise<OrderResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
      include: { items: true, payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Order is not in pending status');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update payment status
      const payment = order.payments[0];
      if (payment) {
        await tx.onlinePayment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            externalPaymentId: paymentConfirmation.externalPaymentId,
            gatewayResponse: (paymentConfirmation.gatewayResponse ?? undefined) as Prisma.InputJsonValue | undefined,
            completedAt: new Date(),
          },
        });
      }

      // Update order status
      await tx.onlineOrder.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      // Decrement stock for each item
      for (const item of order.items) {
        if (!item.productId) continue;

        // Find a stock item to decrement (prefer first available location)
        const stockItem = await tx.stockItem.findFirst({
          where: {
            tenantId,
            productId: item.productId,
            quantityOnHand: { gte: item.quantity },
          },
        });

        if (stockItem) {
          await tx.stockItem.update({
            where: { id: stockItem.id },
            data: { quantityOnHand: { decrement: item.quantity } },
          });

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              id: uuidv4(),
              tenantId,
              stockItemId: stockItem.id,
              movementType: 'OUT',
              quantityChange: -item.quantity,
              referenceType: 'OnlineOrder',
              referenceId: orderId,
              notes: `B2C Order ${order.orderNumber}`,
            },
          });
        }
      }

      // Increment coupon usage if applicable
      const cart = await tx.cart.findFirst({
        where: { tenantId, customerId },
        orderBy: { updatedAt: 'desc' },
      });
      if (cart?.couponCode) {
        await tx.couponCode.update({
          where: { tenantId_code: { tenantId, code: cart.couponCode } },
          data: { usedCount: { increment: 1 } },
        }).catch(() => { /* coupon may not exist */ });
      }

      // Delete the cart
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.delete({ where: { id: cart.id } }).catch(() => { /* may already be deleted */ });
      }
    });

    // Publish completion event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'storefront.order.completed',
      payload: {
        orderId,
        customerId,
        totalPaise: Number(order.totalPaise),
      },
    });

    return this.getOrderResponse(tenantId, orderId);
  }

  /**
   * Cancel an order (customer-initiated).
   */
  async cancelOrder(
    tenantId: string,
    customerId: string,
    orderId: string,
    reason: string,
  ): Promise<OrderResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const cancellableStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled in its current status');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.onlineOrder.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
        },
      });

      // Restore stock if order was confirmed
      if (order.status !== 'PENDING') {
        for (const item of order.items) {
          if (!item.productId) continue;

          const stockItem = await tx.stockItem.findFirst({
            where: { tenantId, productId: item.productId },
          });

          if (stockItem) {
            await tx.stockItem.update({
              where: { id: stockItem.id },
              data: { quantityOnHand: { increment: item.quantity } },
            });

            await tx.stockMovement.create({
              data: {
                id: uuidv4(),
                tenantId,
                stockItemId: stockItem.id,
                movementType: 'RETURN',
                quantityChange: item.quantity,
                referenceType: 'OnlineOrder',
                referenceId: orderId,
                notes: `Cancelled B2C Order ${order.orderNumber}`,
              },
            });
          }
        }
      }

      // Refund payment if captured
      await tx.onlinePayment.updateMany({
        where: { orderId, tenantId, status: 'CAPTURED' },
        data: { status: 'REFUNDED', refundedAt: new Date() },
      });
    });

    return this.getOrderResponse(tenantId, orderId);
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.onlineOrder.count({
      where: {
        tenantId,
        orderNumber: { contains: `/B2C/${yymm}/` },
      },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `ON/B2C/${yymm}/${seq}`;
  }

  private async getOrderResponse(tenantId: string, orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: true,
        shipments: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Fetch product images for order items
    const productIds = order.items.map((i) => i.productId).filter(Boolean) as string[];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, images: true },
    });
    const imgMap = new Map<string, string | null>();
    for (const p of products) {
      const imgs = p.images as unknown;
      imgMap.set(p.id, Array.isArray(imgs) && imgs.length > 0 ? (imgs[0] as string) : null);
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotalPaise: Number(order.subtotalPaise),
      shippingPaise: Number(order.shippingPaise),
      taxPaise: Number(order.taxPaise),
      discountPaise: Number(order.discountPaise),
      totalPaise: Number(order.totalPaise),
      currencyCode: order.currencyCode,
      shippingAddress: order.shippingAddress as Record<string, unknown> | null,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        title: item.title,
        quantity: item.quantity,
        unitPricePaise: Number(item.unitPricePaise),
        totalPaise: Number(item.totalPaise),
        sku: item.sku,
        weightMg: item.weightMg ? Number(item.weightMg) : null,
        productImage: item.productId ? (imgMap.get(item.productId) ?? null) : null,
      })),
      shipments: order.shipments.map((s) => ({
        id: s.id,
        shipmentNumber: s.shipmentNumber,
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        trackingUrl: s.trackingUrl,
        status: s.status,
        estimatedDeliveryDate: s.estimatedDeliveryDate,
        actualDeliveryDate: s.actualDeliveryDate,
      })),
      payments: order.payments.map((p) => ({
        id: p.id,
        method: p.method,
        amountPaise: Number(p.amountPaise),
        status: p.status,
        completedAt: p.completedAt,
      })),
      placedAt: order.placedAt,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelReason: order.cancelReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
