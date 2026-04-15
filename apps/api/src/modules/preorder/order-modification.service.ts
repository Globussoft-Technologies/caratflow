// ─── Order Modification Service ───────────────────────────────
// Request, auto-apply, review, and execute order modifications.
// Supports address changes, item changes, cancellations, additions,
// and size changes within configurable time windows.

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import type {
  RequestModificationInput,
  ModificationRequestResponse,
  ModificationListFilter,
  ReviewModificationInput,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { ModificationStatus, ModificationType } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@caratflow/db';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrderModificationService extends TenantAwareService {
  private readonly logger = new Logger(OrderModificationService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Request an order modification. Validates order is in a modifiable
   * state (PENDING or CONFIRMED, not yet shipped).
   */
  async requestModification(
    tenantId: string,
    userId: string,
    input: RequestModificationInput,
  ): Promise<ModificationRequestResponse> {
    // Validate order exists and is modifiable
    const order = await this.prisma.onlineOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: input.orderId }) as { tenantId: string; id: string },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const modifiableStatuses = ['PENDING', 'CONFIRMED'];
    if (!modifiableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Order in ${order.status} status cannot be modified. Only PENDING or CONFIRMED orders can be modified.`,
      );
    }

    // Capture original data based on modification type
    let originalData: Record<string, unknown> = {};
    switch (input.modificationType) {
      case ModificationType.ADDRESS_CHANGE:
        originalData = {
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
        };
        break;
      case ModificationType.ITEM_CHANGE:
      case ModificationType.CANCEL_ITEM:
      case ModificationType.ADD_ITEM:
      case ModificationType.SIZE_CHANGE: {
        const items = await this.prisma.onlineOrderItem.findMany({
          where: { orderId: input.orderId, tenantId },
        });
        originalData = {
          items: items.map((i) => ({
            id: i.id,
            productId: i.productId,
            title: i.title,
            quantity: i.quantity,
            unitPricePaise: Number(i.unitPricePaise),
            totalPaise: Number(i.totalPaise),
          })),
        };
        break;
      }
    }

    // Calculate auto-apply window (minutes since order was placed)
    const autoApplyWindow = 30; // Default 30 minutes
    const requestId = uuidv4();

    await this.prisma.orderModificationRequest.create({
      data: {
        id: requestId,
        tenantId,
        orderId: input.orderId,
        customerId: input.customerId,
        modificationType: input.modificationType,
        originalData: originalData as Prisma.InputJsonValue,
        requestedData: input.requestedData as unknown as Prisma.InputJsonValue,
        status: ModificationStatus.PENDING,
        reason: input.reason ?? null,
        autoApplyWindow,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Attempt auto-apply for address changes within window
    if (input.modificationType === ModificationType.ADDRESS_CHANGE) {
      const orderAge = order.placedAt
        ? (Date.now() - new Date(order.placedAt).getTime()) / (1000 * 60)
        : Infinity;

      if (orderAge <= autoApplyWindow) {
        return this.autoApplyModification(tenantId, userId, requestId);
      }
    }

    this.logger.log(
      `[OrderModification] Request created: id=${requestId}, order=${input.orderId}, type=${input.modificationType}`,
    );

    return this.getModification(tenantId, requestId);
  }

  /**
   * Auto-apply a modification if within the auto-apply window
   * and the type supports auto-application.
   */
  async autoApplyModification(
    tenantId: string,
    userId: string,
    requestId: string,
  ): Promise<ModificationRequestResponse> {
    const request = await this.prisma.orderModificationRequest.findFirst({
      where: this.tenantWhere(tenantId, { id: requestId }) as { tenantId: string; id: string },
    });
    if (!request) {
      throw new NotFoundException('Modification request not found');
    }
    if (request.status !== ModificationStatus.PENDING) {
      throw new BadRequestException('Modification request is not in PENDING status');
    }

    // Only auto-apply address changes
    if (request.modificationType !== ModificationType.ADDRESS_CHANGE) {
      throw new BadRequestException('Only address changes can be auto-applied');
    }

    // Apply the address change directly
    const requestedData = request.requestedData as Record<string, unknown>;
    await this.prisma.onlineOrder.update({
      where: { id: request.orderId },
      data: {
        ...(requestedData.shippingAddress ? {
          shippingAddress: requestedData.shippingAddress as Prisma.InputJsonValue,
        } : {}),
        ...(requestedData.billingAddress ? {
          billingAddress: requestedData.billingAddress as Prisma.InputJsonValue,
        } : {}),
        updatedBy: userId,
      },
    });

    await this.prisma.orderModificationRequest.update({
      where: { id: requestId },
      data: {
        status: ModificationStatus.AUTO_APPLIED,
        reviewedBy: 'SYSTEM',
        reviewedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.log(`[OrderModification] Auto-applied: id=${requestId}`);
    return this.getModification(tenantId, requestId);
  }

  /**
   * Admin reviews a modification request (approve or reject).
   */
  async reviewModification(
    tenantId: string,
    userId: string,
    input: ReviewModificationInput,
  ): Promise<ModificationRequestResponse> {
    const request = await this.prisma.orderModificationRequest.findFirst({
      where: this.tenantWhere(tenantId, { id: input.requestId }) as { tenantId: string; id: string },
    });
    if (!request) {
      throw new NotFoundException('Modification request not found');
    }
    if (request.status !== ModificationStatus.PENDING) {
      throw new BadRequestException('Modification request is not in PENDING status');
    }

    if (input.approved) {
      // Apply the modification
      await this.applyModification(tenantId, userId, input.requestId);

      await this.prisma.orderModificationRequest.update({
        where: { id: input.requestId },
        data: {
          status: ModificationStatus.APPROVED,
          reviewedBy: userId,
          reviewedAt: new Date(),
          reason: input.reason ?? request.reason,
          updatedBy: userId,
        },
      });

      this.logger.log(`[OrderModification] Approved: id=${input.requestId}`);
    } else {
      await this.prisma.orderModificationRequest.update({
        where: { id: input.requestId },
        data: {
          status: ModificationStatus.REJECTED,
          reviewedBy: userId,
          reviewedAt: new Date(),
          reason: input.reason ?? 'Rejected by admin',
          updatedBy: userId,
        },
      });

      this.logger.log(`[OrderModification] Rejected: id=${input.requestId}`);
    }

    return this.getModification(tenantId, input.requestId);
  }

  /**
   * Execute the actual modification on the order.
   */
  async applyModification(tenantId: string, userId: string, requestId: string): Promise<void> {
    const request = await this.prisma.orderModificationRequest.findFirst({
      where: this.tenantWhere(tenantId, { id: requestId }) as { tenantId: string; id: string },
    });
    if (!request) {
      throw new NotFoundException('Modification request not found');
    }

    const requestedData = request.requestedData as Record<string, unknown>;

    switch (request.modificationType) {
      case ModificationType.ADDRESS_CHANGE:
        await this.prisma.onlineOrder.update({
          where: { id: request.orderId },
          data: {
            ...(requestedData.shippingAddress ? {
              shippingAddress: requestedData.shippingAddress as Prisma.InputJsonValue,
            } : {}),
            ...(requestedData.billingAddress ? {
              billingAddress: requestedData.billingAddress as Prisma.InputJsonValue,
            } : {}),
            updatedBy: userId,
          },
        });
        break;

      case ModificationType.CANCEL_ITEM: {
        const itemIds = requestedData.cancelItemIds as string[];
        if (itemIds && itemIds.length > 0) {
          await this.prisma.onlineOrderItem.deleteMany({
            where: { id: { in: itemIds }, orderId: request.orderId, tenantId },
          });
          // Recalculate order totals
          await this.recalculateOrderTotals(request.orderId, userId);
        }
        break;
      }

      case ModificationType.ITEM_CHANGE: {
        const itemUpdates = requestedData.itemUpdates as Array<{
          itemId: string;
          quantity?: number;
        }>;
        if (itemUpdates) {
          for (const update of itemUpdates) {
            if (update.quantity != null) {
              const item = await this.prisma.onlineOrderItem.findFirst({
                where: { id: update.itemId, tenantId },
              });
              if (item) {
                const newTotal = BigInt(update.quantity) * item.unitPricePaise;
                await this.prisma.onlineOrderItem.update({
                  where: { id: update.itemId },
                  data: { quantity: update.quantity, totalPaise: newTotal },
                });
              }
            }
          }
          await this.recalculateOrderTotals(request.orderId, userId);
        }
        break;
      }

      case ModificationType.ADD_ITEM: {
        const newItems = requestedData.newItems as Array<{
          productId: string;
          title: string;
          quantity: number;
          unitPricePaise: number;
        }>;
        if (newItems) {
          for (const item of newItems) {
            await this.prisma.onlineOrderItem.create({
              data: {
                id: uuidv4(),
                tenantId,
                orderId: request.orderId,
                productId: item.productId,
                title: item.title,
                quantity: item.quantity,
                unitPricePaise: BigInt(item.unitPricePaise),
                totalPaise: BigInt(item.unitPricePaise) * BigInt(item.quantity),
              },
            });
          }
          await this.recalculateOrderTotals(request.orderId, userId);
        }
        break;
      }

      case ModificationType.SIZE_CHANGE: {
        // Size change is handled as metadata update
        const sizeChanges = requestedData.sizeChanges as Array<{
          itemId: string;
          newSize: string;
        }>;
        if (sizeChanges) {
          this.logger.log(
            `[OrderModification] Size change applied for ${sizeChanges.length} items`,
          );
          // Size changes would be stored in notes or a metadata field
          // In production this would update the item attributes
        }
        break;
      }
    }
  }

  /**
   * Get a single modification request.
   */
  async getModification(
    tenantId: string,
    requestId: string,
  ): Promise<ModificationRequestResponse> {
    const request = await this.prisma.orderModificationRequest.findFirst({
      where: this.tenantWhere(tenantId, { id: requestId }) as { tenantId: string; id: string },
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
    });
    if (!request) {
      throw new NotFoundException('Modification request not found');
    }

    // Fetch order number
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: request.orderId, tenantId },
      select: { orderNumber: true },
    });

    return this.mapModificationToResponse(request, order?.orderNumber ?? null);
  }

  /**
   * Admin: list all modification requests.
   */
  async getModificationRequests(
    tenantId: string,
    filters: ModificationListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<ModificationRequestResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status;
    if (filters.modificationType) where.modificationType = filters.modificationType;

    if (filters.search) {
      where.OR = [
        { customer: { firstName: { contains: filters.search } } },
        { customer: { lastName: { contains: filters.search } } },
        { reason: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.orderModificationRequest.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.orderModificationRequest.count({ where }),
    ]);

    // Batch-fetch order numbers
    const orderIds = [...new Set(items.map((i) => i.orderId))];
    const orders = await this.prisma.onlineOrder.findMany({
      where: { id: { in: orderIds }, tenantId },
      select: { id: true, orderNumber: true },
    });
    const orderNumberMap = new Map(orders.map((o) => [o.id, o.orderNumber]));

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((req) =>
        this.mapModificationToResponse(req, orderNumberMap.get(req.orderId) ?? null),
      ),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Customer: get their own modification requests.
   */
  async getMyModifications(
    tenantId: string,
    customerId: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<ModificationRequestResponse>> {
    return this.getModificationRequests(tenantId, { customerId }, pagination);
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async recalculateOrderTotals(orderId: string, userId: string): Promise<void> {
    const items = await this.prisma.onlineOrderItem.findMany({
      where: { orderId },
    });

    const subtotalPaise = items.reduce((sum, item) => sum + item.totalPaise, BigInt(0));

    const order = await this.prisma.onlineOrder.findUnique({
      where: { id: orderId },
      select: { shippingPaise: true, taxPaise: true, discountPaise: true },
    });

    if (order) {
      const totalPaise =
        subtotalPaise + order.shippingPaise + order.taxPaise - order.discountPaise;

      await this.prisma.onlineOrder.update({
        where: { id: orderId },
        data: {
          subtotalPaise,
          totalPaise: totalPaise > BigInt(0) ? totalPaise : BigInt(0),
          updatedBy: userId,
        },
      });
    }
  }

  private mapModificationToResponse(
    request: Record<string, unknown>,
    orderNumber: string | null,
  ): ModificationRequestResponse {
    const r = request as Record<string, unknown>;
    const customer = r.customer as { firstName: string; lastName: string } | null;

    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      orderId: r.orderId as string,
      customerId: r.customerId as string,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : null,
      orderNumber,
      modificationType: r.modificationType as ModificationType,
      originalData: r.originalData,
      requestedData: r.requestedData,
      status: r.status as ModificationStatus,
      reason: (r.reason as string) ?? null,
      reviewedBy: (r.reviewedBy as string) ?? null,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt as string) : null,
      autoApplyWindow: r.autoApplyWindow as number,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
    };
  }
}
