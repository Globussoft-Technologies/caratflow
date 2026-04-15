// ─── Customer Portal Orders Service ───────────────────────────
// Order listing, detail, tracking, invoice, returns, cancellation
// for B2C customers viewing their own orders.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { parsePagination, buildPaginatedResult } from '../../common/pagination.helper';
import type { Prisma } from '@caratflow/db';
import type {
  OrderListInput,
  OrderSummaryResponse,
  OrderDetailResponse,
  ShipmentTrackingResponse,
  ReturnRequestInput,
  ReturnRequestResponse,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';

/** Statuses that allow cancellation */
const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'] as const;

@Injectable()
export class CustomerPortalOrdersService extends TenantAwareService {
  private readonly logger = new Logger(CustomerPortalOrdersService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── My Orders ──────────────────────────────────────────────────

  async getMyOrders(
    tenantId: string,
    customerId: string,
    input: OrderListInput,
  ): Promise<PaginatedResult<OrderSummaryResponse>> {
    const { skip, take, page, limit } = parsePagination(input);

    const where: Prisma.OnlineOrderWhereInput = {
      tenantId,
      customerId,
    };
    if (input.status) where.status = input.status;
    if (input.dateFrom || input.dateTo) {
      where.placedAt = {};
      if (input.dateFrom) where.placedAt.gte = input.dateFrom;
      if (input.dateTo) where.placedAt.lte = input.dateTo;
    }

    const [orders, total] = await Promise.all([
      this.prisma.onlineOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            take: 1,
            include: { product: { select: { images: true } } },
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.onlineOrder.count({ where }),
    ]);

    const items: OrderSummaryResponse[] = orders.map((order) => {
      // Extract first item's thumbnail
      const firstItem = order.items[0];
      let thumbnail: string | null = null;
      if (firstItem?.product?.images) {
        const images = firstItem.product.images as string[];
        thumbnail = images.length > 0 ? (images[0] ?? null) : null;
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status as OrderSummaryResponse['status'],
        totalPaise: Number(order.totalPaise),
        currencyCode: order.currencyCode,
        itemCount: order._count.items,
        thumbnail,
        placedAt: order.placedAt,
        createdAt: order.createdAt,
      };
    });

    return buildPaginatedResult(items, total, page, limit);
  }

  // ─── Order Detail ───────────────────────────────────────────────

  async getOrderDetail(
    tenantId: string,
    customerId: string,
    orderId: string,
  ): Promise<OrderDetailResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
      include: {
        items: {
          include: {
            product: { select: { images: true, sku: true } },
          },
        },
        shipments: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status as OrderDetailResponse['status'],
      subtotalPaise: Number(order.subtotalPaise),
      shippingPaise: Number(order.shippingPaise),
      taxPaise: Number(order.taxPaise),
      discountPaise: Number(order.discountPaise),
      totalPaise: Number(order.totalPaise),
      currencyCode: order.currencyCode,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      notes: order.notes,
      cancelReason: order.cancelReason,
      placedAt: order.placedAt,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      items: order.items.map((item) => {
        const images = (item.product?.images as string[]) ?? [];
        return {
          id: item.id,
          title: item.title,
          sku: item.sku ?? item.product?.sku ?? null,
          quantity: item.quantity,
          unitPricePaise: Number(item.unitPricePaise),
          totalPaise: Number(item.totalPaise),
          weightMg: item.weightMg ? Number(item.weightMg) : null,
          image: images.length > 0 ? (images[0] ?? null) : null,
        };
      }),
      payments: order.payments.map((p) => ({
        id: p.id,
        method: p.method,
        amountPaise: Number(p.amountPaise),
        currencyCode: p.currencyCode,
        status: p.status,
        completedAt: p.completedAt,
      })),
      shipments: order.shipments.map((s) => ({
        id: s.id,
        shipmentNumber: s.shipmentNumber,
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        trackingUrl: s.trackingUrl,
        status: s.status as ShipmentTrackingResponse['status'],
        estimatedDeliveryDate: s.estimatedDeliveryDate,
        actualDeliveryDate: s.actualDeliveryDate,
        createdAt: s.createdAt,
      })),
      invoiceUrl: `/api/v1/store/account/orders/${order.id}/invoice`,
    };
  }

  // ─── Live Tracking ──────────────────────────────────────────────

  async getOrderTrackingLive(
    tenantId: string,
    customerId: string,
    orderId: string,
  ): Promise<ShipmentTrackingResponse[]> {
    // Verify order ownership
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const shipments = await this.prisma.shipment.findMany({
      where: { tenantId, orderId },
      orderBy: { createdAt: 'desc' },
    });

    return shipments.map((s) => ({
      id: s.id,
      shipmentNumber: s.shipmentNumber,
      carrier: s.carrier,
      trackingNumber: s.trackingNumber,
      trackingUrl: s.trackingUrl,
      status: s.status as ShipmentTrackingResponse['status'],
      estimatedDeliveryDate: s.estimatedDeliveryDate,
      actualDeliveryDate: s.actualDeliveryDate,
      createdAt: s.createdAt,
    }));
  }

  // ─── Download Invoice ───────────────────────────────────────────

  async downloadInvoice(
    tenantId: string,
    customerId: string,
    orderId: string,
  ): Promise<{ invoiceUrl: string; orderNumber: string }> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
      select: { id: true, orderNumber: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'PENDING') {
      throw new BadRequestException('Invoice is not available for pending orders');
    }

    // In production, this would generate or retrieve a PDF from S3.
    // Return a URL that a separate PDF generation service can serve.
    const invoiceUrl = `/api/v1/store/invoices/${order.id}/pdf`;

    return { invoiceUrl, orderNumber: order.orderNumber };
  }

  // ─── Request Return ─────────────────────────────────────────────

  async requestReturn(
    tenantId: string,
    customerId: string,
    input: ReturnRequestInput,
  ): Promise<ReturnRequestResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: input.orderId, tenantId, customerId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Returns can only be requested for delivered orders');
    }

    // Validate return items exist in the order
    const orderItemMap = new Map(order.items.map((item) => [item.id, item]));
    let subtotalPaise = BigInt(0);

    const returnItems: Array<{
      originalLineItemId: string;
      productId: string | null;
      quantity: number;
      returnPricePaise: bigint;
      reason: string;
    }> = [];

    for (const ri of input.items) {
      const orderItem = orderItemMap.get(ri.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(`Order item ${ri.orderItemId} not found in this order`);
      }
      if (ri.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Return quantity (${ri.quantity}) exceeds order quantity (${orderItem.quantity}) for item ${orderItem.title}`,
        );
      }

      const perUnitPaise = orderItem.totalPaise / BigInt(orderItem.quantity);
      const itemReturnPaise = perUnitPaise * BigInt(ri.quantity);
      subtotalPaise += itemReturnPaise;

      returnItems.push({
        originalLineItemId: orderItem.id,
        productId: orderItem.productId,
        quantity: ri.quantity,
        returnPricePaise: itemReturnPaise,
        reason: ri.reason,
      });
    }

    // For jewelry, metal rate differences may apply. In a real implementation,
    // the current rate would be fetched and compared with the purchase rate.
    // Here we store 0 as a placeholder; the admin-side can adjust.
    const metalRateDifferencePaise = BigInt(0);
    const refundAmountPaise = subtotalPaise - metalRateDifferencePaise;

    // Generate return number
    const returnCount = await this.prisma.saleReturn.count({ where: { tenantId } });
    const returnNumber = `RET-${String(returnCount + 1).padStart(6, '0')}`;

    // We need a Sale record to link the return to. For online orders,
    // find the linked sale or create the return referencing the order.
    // Since the schema expects originalSaleId, we look for a Sale linked
    // to this order or create a standalone return entry.
    // For now, we create a return record. In practice, online orders may
    // have a corresponding Sale created at fulfillment time.

    // Find the first Sale for this customer (as a reference point) or
    // handle gracefully. The SaleReturn requires originalSaleId -- we'll
    // look for a sale matching the order's timeframe.
    const linkedSale = await this.prisma.sale.findFirst({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    });

    if (!linkedSale) {
      // Create a minimal return record without a linked sale
      // This is a B2C-specific flow where returns may not have a POS sale
      this.logger.warn(
        `No linked sale found for order ${order.id} -- creating return without sale reference`,
      );
    }

    const saleReturn = await this.prisma.$transaction(async (tx) => {
      // If no linked sale exists, we need a workaround since originalSaleId is required.
      // In practice the fulfillment process would create a Sale. For the API, we require it.
      if (!linkedSale) {
        throw new BadRequestException(
          'Return cannot be processed -- no linked sale record found. Please contact support.',
        );
      }

      const ret = await tx.saleReturn.create({
        data: {
          tenantId,
          returnNumber,
          originalSaleId: linkedSale.id,
          customerId,
          locationId: linkedSale.locationId,
          reason: input.reason,
          status: 'DRAFT',
          subtotalPaise,
          refundAmountPaise,
          refundMethod: input.preferredRefundMethod,
          metalRateDifferencePaise,
          createdBy: customerId,
          updatedBy: customerId,
          items: {
            create: returnItems.map((ri) => ({
              tenantId,
              originalLineItemId: ri.originalLineItemId,
              productId: ri.productId,
              quantity: ri.quantity,
              returnPricePaise: ri.returnPricePaise,
              reason: ri.reason,
            })),
          },
        },
        include: { items: true },
      });

      // Update order status
      await tx.onlineOrder.update({
        where: { id: order.id },
        data: { status: 'RETURNED', updatedBy: customerId },
      });

      return ret;
    });

    return {
      id: saleReturn.id,
      returnNumber: saleReturn.returnNumber,
      status: saleReturn.status,
      reason: saleReturn.reason,
      subtotalPaise: Number(saleReturn.subtotalPaise),
      refundAmountPaise: Number(saleReturn.refundAmountPaise),
      refundMethod: saleReturn.refundMethod,
      metalRateDifferencePaise: Number(saleReturn.metalRateDifferencePaise),
      createdAt: saleReturn.createdAt,
      items: saleReturn.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        returnPricePaise: Number(item.returnPricePaise),
        reason: item.reason,
      })),
    };
  }

  // ─── Return Status ──────────────────────────────────────────────

  async getReturnStatus(
    tenantId: string,
    customerId: string,
    returnId: string,
  ): Promise<ReturnRequestResponse> {
    const saleReturn = await this.prisma.saleReturn.findFirst({
      where: { id: returnId, tenantId, customerId },
      include: { items: true },
    });
    if (!saleReturn) throw new NotFoundException('Return not found');

    return {
      id: saleReturn.id,
      returnNumber: saleReturn.returnNumber,
      status: saleReturn.status,
      reason: saleReturn.reason,
      subtotalPaise: Number(saleReturn.subtotalPaise),
      refundAmountPaise: Number(saleReturn.refundAmountPaise),
      refundMethod: saleReturn.refundMethod,
      metalRateDifferencePaise: Number(saleReturn.metalRateDifferencePaise),
      createdAt: saleReturn.createdAt,
      items: saleReturn.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        returnPricePaise: Number(item.returnPricePaise),
        reason: item.reason,
      })),
    };
  }

  // ─── Cancel Order ───────────────────────────────────────────────

  async cancelOrder(
    tenantId: string,
    customerId: string,
    orderId: string,
  ): Promise<{ success: boolean; message: string }> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!CANCELLABLE_STATUSES.includes(order.status as typeof CANCELLABLE_STATUSES[number])) {
      throw new BadRequestException(
        `Order cannot be cancelled -- current status is ${order.status}. Only PENDING or CONFIRMED orders can be cancelled.`,
      );
    }

    await this.prisma.onlineOrder.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelReason: 'Cancelled by customer',
        updatedBy: customerId,
      },
    });

    this.logger.log(`Order ${order.orderNumber} cancelled by customer ${customerId}`);

    return {
      success: true,
      message: `Order ${order.orderNumber} has been cancelled successfully.`,
    };
  }
}
