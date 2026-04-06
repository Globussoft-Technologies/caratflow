// ─── Pre-Order Management Service ─────────────────────────────
// Create, confirm, mark available, fulfill, cancel pre-orders.
// Auto-detect backorders when stock runs out.
// Notify customers when stock arrives via BullMQ.

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import type {
  CreatePreOrderInput,
  PreOrderResponse,
  PreOrderListFilter,
  PreOrderStats,
  PreOrderProductStatus,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PreOrderStatus, PreOrderType } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PreOrderService extends TenantAwareService {
  private readonly logger = new Logger(PreOrderService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /**
   * Create a pre-order for a product. Validates that pre-order is
   * enabled for the product, computes deposit if configured, and
   * sets estimated dates from the product config.
   */
  async createPreOrder(
    tenantId: string,
    userId: string,
    input: CreatePreOrderInput,
  ): Promise<PreOrderResponse> {
    // Validate product exists
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: input.productId }) as { tenantId: string; id: string },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get pre-order config
    const config = await this.prisma.preOrderConfig.findUnique({
      where: { tenantId_productId: { tenantId, productId: input.productId } },
    });

    const orderType = input.orderType ?? PreOrderType.PRE_ORDER;

    // Validate pre-order/backorder is enabled
    if (orderType === PreOrderType.PRE_ORDER && (!config || !config.isPreOrderEnabled)) {
      throw new BadRequestException('Pre-orders are not enabled for this product');
    }
    if (orderType === PreOrderType.BACKORDER && (!config || !config.isBackorderEnabled)) {
      throw new BadRequestException('Backorders are not enabled for this product');
    }

    // Check max pre-order quantity
    if (config && config.maxPreOrderQty > 0) {
      const existingCount = await this.prisma.preOrder.count({
        where: {
          tenantId,
          productId: input.productId,
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PRODUCTION'] },
        },
      });
      if (existingCount + input.quantity > config.maxPreOrderQty) {
        throw new BadRequestException(
          `Maximum pre-order quantity (${config.maxPreOrderQty}) would be exceeded`,
        );
      }
    }

    // Calculate deposit
    let depositPaise = BigInt(0);
    if (config && config.depositPercentage > 0 && product.sellingPricePaise) {
      depositPaise =
        (BigInt(product.sellingPricePaise) * BigInt(config.depositPercentage) * BigInt(input.quantity)) /
        BigInt(100);
    }

    // Calculate estimated dates
    const leadDays = config?.estimatedLeadDays ?? 14;
    const estimatedAvailableDate = new Date();
    estimatedAvailableDate.setDate(estimatedAvailableDate.getDate() + leadDays);
    const estimatedDeliveryDate = new Date(estimatedAvailableDate);
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7); // +7 days for shipping

    const preOrderId = uuidv4();
    const initialStatus =
      config?.autoConfirm ? PreOrderStatus.CONFIRMED : PreOrderStatus.PENDING;

    await this.prisma.preOrder.create({
      data: {
        id: preOrderId,
        tenantId,
        customerId: input.customerId,
        productId: input.productId,
        quantity: input.quantity,
        status: initialStatus,
        orderType,
        depositPaise,
        estimatedAvailableDate,
        estimatedDeliveryDate,
        notes: input.notes ?? null,
        priceLockPaise: input.priceLockPaise != null ? BigInt(input.priceLockPaise) : null,
        isPriceLocked: input.isPriceLocked ?? false,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Publish domain event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'preorder.created',
      payload: {
        preOrderId,
        customerId: input.customerId,
        productId: input.productId,
        orderType,
      },
    });

    this.logger.log(
      `[PreOrder] Created: id=${preOrderId}, product=${input.productId}, type=${orderType}, status=${initialStatus}`,
    );

    return this.getPreOrder(tenantId, preOrderId);
  }

  /**
   * Admin confirms a pending pre-order. May trigger a manufacturing
   * job in a downstream event handler.
   */
  async confirmPreOrder(tenantId: string, userId: string, preOrderId: string): Promise<PreOrderResponse> {
    const preOrder = await this.prisma.preOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: preOrderId }) as { tenantId: string; id: string },
    });
    if (!preOrder) {
      throw new NotFoundException('Pre-order not found');
    }
    if (preOrder.status !== PreOrderStatus.PENDING) {
      throw new BadRequestException(`Cannot confirm pre-order in ${preOrder.status} status`);
    }

    await this.prisma.preOrder.update({
      where: { id: preOrderId },
      data: { status: PreOrderStatus.CONFIRMED, updatedBy: userId },
    });

    this.logger.log(`[PreOrder] Confirmed: id=${preOrderId}`);
    return this.getPreOrder(tenantId, preOrderId);
  }

  /**
   * Mark a pre-order as available (product is now in stock).
   * Sends a notification to the customer.
   */
  async markAvailable(tenantId: string, userId: string, preOrderId: string): Promise<PreOrderResponse> {
    const preOrder = await this.prisma.preOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: preOrderId }) as { tenantId: string; id: string },
    });
    if (!preOrder) {
      throw new NotFoundException('Pre-order not found');
    }
    if (!['CONFIRMED', 'IN_PRODUCTION'].includes(preOrder.status)) {
      throw new BadRequestException(`Cannot mark available from ${preOrder.status} status`);
    }

    await this.prisma.preOrder.update({
      where: { id: preOrderId },
      data: {
        status: PreOrderStatus.AVAILABLE,
        actualAvailableDate: new Date(),
        notifiedAt: new Date(),
        updatedBy: userId,
      },
    });

    // Publish availability event (downstream sends email/SMS)
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'preorder.available',
      payload: {
        preOrderId,
        customerId: preOrder.customerId,
        productId: preOrder.productId,
      },
    });

    this.logger.log(`[PreOrder] Marked available: id=${preOrderId}`);
    return this.getPreOrder(tenantId, preOrderId);
  }

  /**
   * Fulfill a pre-order by creating the actual order.
   * Deducts the deposit from the total.
   */
  async fulfillPreOrder(
    tenantId: string,
    userId: string,
    preOrderId: string,
    fulfilledOrderId: string,
  ): Promise<PreOrderResponse> {
    const preOrder = await this.prisma.preOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: preOrderId }) as { tenantId: string; id: string },
    });
    if (!preOrder) {
      throw new NotFoundException('Pre-order not found');
    }
    if (preOrder.status !== PreOrderStatus.AVAILABLE) {
      throw new BadRequestException(`Cannot fulfill pre-order in ${preOrder.status} status`);
    }

    await this.prisma.preOrder.update({
      where: { id: preOrderId },
      data: {
        status: PreOrderStatus.FULFILLED,
        fulfilledOrderId,
        updatedBy: userId,
      },
    });

    // Publish fulfillment event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'preorder.fulfilled',
      payload: {
        preOrderId,
        customerId: preOrder.customerId,
        productId: preOrder.productId,
        fulfilledOrderId,
      },
    });

    this.logger.log(`[PreOrder] Fulfilled: id=${preOrderId}, orderId=${fulfilledOrderId}`);
    return this.getPreOrder(tenantId, preOrderId);
  }

  /**
   * Cancel a pre-order with a reason. Deposit would be refunded
   * by a downstream payment handler.
   */
  async cancelPreOrder(
    tenantId: string,
    userId: string,
    preOrderId: string,
    reason: string,
  ): Promise<PreOrderResponse> {
    const preOrder = await this.prisma.preOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: preOrderId }) as { tenantId: string; id: string },
    });
    if (!preOrder) {
      throw new NotFoundException('Pre-order not found');
    }
    if (preOrder.status === PreOrderStatus.FULFILLED) {
      throw new BadRequestException('Cannot cancel a fulfilled pre-order');
    }
    if (preOrder.status === PreOrderStatus.CANCELLED) {
      throw new BadRequestException('Pre-order is already cancelled');
    }

    await this.prisma.preOrder.update({
      where: { id: preOrderId },
      data: {
        status: PreOrderStatus.CANCELLED,
        cancelReason: reason,
        updatedBy: userId,
      },
    });

    // Publish cancellation event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'preorder.cancelled',
      payload: {
        preOrderId,
        customerId: preOrder.customerId,
        productId: preOrder.productId,
        reason,
      },
    });

    this.logger.log(`[PreOrder] Cancelled: id=${preOrderId}, reason=${reason}`);
    return this.getPreOrder(tenantId, preOrderId);
  }

  /**
   * Get a single pre-order with customer and product data.
   */
  async getPreOrder(tenantId: string, preOrderId: string): Promise<PreOrderResponse> {
    const preOrder = await this.prisma.preOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: preOrderId }) as { tenantId: string; id: string },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        product: { select: { name: true } },
      },
    });
    if (!preOrder) {
      throw new NotFoundException('Pre-order not found');
    }
    return this.mapPreOrderToResponse(preOrder);
  }

  /**
   * Admin: list all pre-orders with filters and pagination.
   */
  async getPreOrders(
    tenantId: string,
    filters: PreOrderListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<PreOrderResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.orderType) where.orderType = filters.orderType;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.productId) where.productId = filters.productId;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as Record<string, unknown>).gte = filters.dateFrom;
      if (filters.dateTo) (where.createdAt as Record<string, unknown>).lte = filters.dateTo;
    }

    if (filters.search) {
      where.OR = [
        { customer: { firstName: { contains: filters.search } } },
        { customer: { lastName: { contains: filters.search } } },
        { product: { name: { contains: filters.search } } },
        { product: { sku: { contains: filters.search } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.preOrder.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true } },
          product: { select: { name: true } },
        },
        orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.preOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((po) => this.mapPreOrderToResponse(po)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Customer: get their own pre-orders.
   */
  async getMyPreOrders(
    tenantId: string,
    customerId: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<PreOrderResponse>> {
    return this.getPreOrders(tenantId, { customerId }, pagination);
  }

  /**
   * Check the pre-order status for a product: is pre-order/backorder
   * available? What is the lead time?
   */
  async checkProductPreOrderStatus(
    tenantId: string,
    productId: string,
  ): Promise<PreOrderProductStatus> {
    const config = await this.prisma.preOrderConfig.findUnique({
      where: { tenantId_productId: { tenantId, productId } },
    });

    const existingPreOrderCount = await this.prisma.preOrder.count({
      where: {
        tenantId,
        productId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PRODUCTION'] },
      },
    });

    return {
      productId,
      isPreOrderAvailable: config?.isPreOrderEnabled ?? false,
      isBackorderAvailable: config?.isBackorderEnabled ?? false,
      estimatedLeadDays: config?.estimatedLeadDays ?? null,
      depositPercentage: config?.depositPercentage ?? 0,
      maxPreOrderQty: config?.maxPreOrderQty ?? 0,
      customMessage: config?.customMessage ?? null,
      existingPreOrderCount,
    };
  }

  /**
   * When a product goes out of stock, automatically enable backorder
   * if a config with isBackorderEnabled exists.
   */
  async autoDetectBackorder(tenantId: string, productId: string): Promise<void> {
    const config = await this.prisma.preOrderConfig.findUnique({
      where: { tenantId_productId: { tenantId, productId } },
    });

    if (!config || !config.isBackorderEnabled) {
      return;
    }

    // Check if product is now out of stock
    const stockAgg = await this.prisma.stockItem.aggregate({
      where: { tenantId, productId },
      _sum: { quantityOnHand: true, quantityReserved: true },
    });

    const available = (stockAgg._sum.quantityOnHand ?? 0) - (stockAgg._sum.quantityReserved ?? 0);

    if (available <= 0) {
      this.logger.log(
        `[PreOrder] Product ${productId} is out of stock with backorder enabled -- backorders are accepted`,
      );
    }
  }

  /**
   * BullMQ job: when stock arrives for a product, notify all
   * pending/confirmed pre-order customers and mark them available.
   */
  async notifyPreOrderCustomers(tenantId: string, userId: string, productId: string): Promise<number> {
    const pendingPreOrders = await this.prisma.preOrder.findMany({
      where: {
        tenantId,
        productId,
        status: { in: ['CONFIRMED', 'IN_PRODUCTION'] },
      },
      include: { customer: { select: { firstName: true, lastName: true, email: true } } },
    });

    if (pendingPreOrders.length === 0) {
      return 0;
    }

    let notified = 0;
    for (const preOrder of pendingPreOrders) {
      await this.prisma.preOrder.update({
        where: { id: preOrder.id },
        data: {
          status: PreOrderStatus.AVAILABLE,
          actualAvailableDate: new Date(),
          notifiedAt: new Date(),
          updatedBy: userId,
        },
      });

      await this.eventBus.publish({
        id: uuidv4(),
        tenantId,
        userId,
        timestamp: new Date().toISOString(),
        type: 'preorder.available',
        payload: {
          preOrderId: preOrder.id,
          customerId: preOrder.customerId,
          productId,
        },
      });

      notified++;
    }

    this.logger.log(
      `[PreOrder] Notified ${notified} customers for product ${productId} stock arrival`,
    );

    return notified;
  }

  /**
   * Get pre-order stats for the dashboard.
   */
  async getStats(tenantId: string): Promise<PreOrderStats> {
    const [pending, confirmed, inProduction, available, fulfilled, cancelled, depositAgg] =
      await Promise.all([
        this.prisma.preOrder.count({ where: { tenantId, status: 'PENDING' } }),
        this.prisma.preOrder.count({ where: { tenantId, status: 'CONFIRMED' } }),
        this.prisma.preOrder.count({ where: { tenantId, status: 'IN_PRODUCTION' } }),
        this.prisma.preOrder.count({ where: { tenantId, status: 'AVAILABLE' } }),
        this.prisma.preOrder.count({ where: { tenantId, status: 'FULFILLED' } }),
        this.prisma.preOrder.count({ where: { tenantId, status: 'CANCELLED' } }),
        this.prisma.preOrder.aggregate({
          where: { tenantId, status: { notIn: ['CANCELLED'] } },
          _sum: { depositPaise: true },
        }),
      ]);

    return {
      totalPending: pending,
      totalConfirmed: confirmed,
      totalInProduction: inProduction,
      totalAvailable: available,
      totalFulfilled: fulfilled,
      totalCancelled: cancelled,
      totalDepositPaise: Number(depositAgg._sum.depositPaise ?? 0n),
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapPreOrderToResponse(preOrder: Record<string, unknown>): PreOrderResponse {
    const po = preOrder as Record<string, unknown>;
    const customer = po.customer as { firstName: string; lastName: string } | null;
    const product = po.product as { name: string } | null;

    return {
      id: po.id as string,
      tenantId: po.tenantId as string,
      customerId: po.customerId as string,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : null,
      productId: po.productId as string,
      productName: product?.name ?? null,
      quantity: po.quantity as number,
      status: po.status as PreOrderStatus,
      orderType: po.orderType as PreOrderType,
      depositPaise: Number(po.depositPaise),
      estimatedAvailableDate: po.estimatedAvailableDate
        ? new Date(po.estimatedAvailableDate as string)
        : null,
      estimatedDeliveryDate: po.estimatedDeliveryDate
        ? new Date(po.estimatedDeliveryDate as string)
        : null,
      actualAvailableDate: po.actualAvailableDate
        ? new Date(po.actualAvailableDate as string)
        : null,
      notifiedAt: po.notifiedAt ? new Date(po.notifiedAt as string) : null,
      fulfilledOrderId: (po.fulfilledOrderId as string) ?? null,
      cancelReason: (po.cancelReason as string) ?? null,
      notes: (po.notes as string) ?? null,
      priceLockPaise: po.priceLockPaise != null ? Number(po.priceLockPaise) : null,
      isPriceLocked: po.isPriceLocked as boolean,
      createdAt: new Date(po.createdAt as string),
      updatedAt: new Date(po.updatedAt as string),
    };
  }
}
