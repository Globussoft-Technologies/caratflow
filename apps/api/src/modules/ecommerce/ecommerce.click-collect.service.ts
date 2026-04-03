// ─── E-Commerce Click & Collect Service ───────────────────────
// Mark ready, notify customer, confirm pickup, handle expiry.

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import type {
  ClickAndCollectInput,
  ClickAndCollectResponse,
  ClickAndCollectListFilter,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { ClickAndCollectStatus } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EcommerceClickCollectService extends TenantAwareService {
  private readonly logger = new Logger(EcommerceClickCollectService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Create a click & collect entry for an order.
   */
  async create(tenantId: string, userId: string, input: ClickAndCollectInput): Promise<ClickAndCollectResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: input.orderId, tenantId },
    });
    if (!order) {
      throw new NotFoundException('Online order not found');
    }

    const location = await this.prisma.location.findFirst({
      where: { id: input.locationId, tenantId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Default expiry: 7 days from now
    const expiresAt = input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const record = await this.prisma.clickAndCollect.create({
      data: {
        id: uuidv4(),
        tenantId,
        orderId: input.orderId,
        locationId: input.locationId,
        status: 'READY_FOR_PICKUP',
        readyAt: new Date(),
        expiresAt,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    this.logger.log(`Click & collect created for order ${order.orderNumber} at location ${location.name}`);

    return this.mapToResponse(record);
  }

  /**
   * Mark as notified (customer has been informed).
   */
  async markNotified(tenantId: string, userId: string, id: string): Promise<ClickAndCollectResponse> {
    const record = await this.prisma.clickAndCollect.findFirst({
      where: { id, tenantId },
    });
    if (!record) {
      throw new NotFoundException('Click & collect record not found');
    }

    if (record.status !== 'READY_FOR_PICKUP') {
      throw new BadRequestException('Can only notify when ready for pickup');
    }

    const updated = await this.prisma.clickAndCollect.update({
      where: { id },
      data: {
        status: 'NOTIFIED',
        notifiedAt: new Date(),
        updatedBy: userId,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Confirm pickup.
   */
  async confirmPickup(tenantId: string, userId: string, id: string): Promise<ClickAndCollectResponse> {
    const record = await this.prisma.clickAndCollect.findFirst({
      where: { id, tenantId },
    });
    if (!record) {
      throw new NotFoundException('Click & collect record not found');
    }

    if (!['READY_FOR_PICKUP', 'NOTIFIED'].includes(record.status)) {
      throw new BadRequestException('Cannot confirm pickup in current status');
    }

    const updated = await this.prisma.clickAndCollect.update({
      where: { id },
      data: {
        status: 'PICKED_UP',
        pickedUpAt: new Date(),
        updatedBy: userId,
      },
    });

    // Update the order status to DELIVERED
    await this.prisma.onlineOrder.update({
      where: { id: record.orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.log(`Click & collect picked up: ${id}`);

    return this.mapToResponse(updated);
  }

  /**
   * Cancel a click & collect.
   */
  async cancel(tenantId: string, userId: string, id: string): Promise<ClickAndCollectResponse> {
    const record = await this.prisma.clickAndCollect.findFirst({
      where: { id, tenantId },
    });
    if (!record) {
      throw new NotFoundException('Click & collect record not found');
    }

    if (record.status === 'PICKED_UP') {
      throw new BadRequestException('Cannot cancel after pickup');
    }

    const updated = await this.prisma.clickAndCollect.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedBy: userId,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Handle expired click & collect entries.
   */
  async handleExpired(tenantId: string): Promise<number> {
    const result = await this.prisma.clickAndCollect.updateMany({
      where: {
        tenantId,
        status: { in: ['READY_FOR_PICKUP', 'NOTIFIED'] },
        expiresAt: { lte: new Date() },
      },
      data: { status: 'CANCELLED' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} click & collect records for tenant ${tenantId}`);
    }

    return result.count;
  }

  /**
   * Get a single click & collect record.
   */
  async get(tenantId: string, id: string): Promise<ClickAndCollectResponse> {
    const record = await this.prisma.clickAndCollect.findFirst({
      where: { id, tenantId },
    });
    if (!record) {
      throw new NotFoundException('Click & collect record not found');
    }
    return this.mapToResponse(record);
  }

  /**
   * List click & collect records with filters.
   */
  async list(
    tenantId: string,
    filters: ClickAndCollectListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<ClickAndCollectResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      this.prisma.clickAndCollect.findMany({
        where,
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.clickAndCollect.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((r) => this.mapToResponse(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Get queue for a specific location.
   */
  async getQueue(tenantId: string, locationId: string): Promise<ClickAndCollectResponse[]> {
    const records = await this.prisma.clickAndCollect.findMany({
      where: {
        tenantId,
        locationId,
        status: { in: ['READY_FOR_PICKUP', 'NOTIFIED'] },
      },
      orderBy: { readyAt: 'asc' },
    });

    return records.map((r) => this.mapToResponse(r));
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapToResponse(r: Record<string, unknown>): ClickAndCollectResponse {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      orderId: r.orderId as string,
      locationId: r.locationId as string,
      status: r.status as ClickAndCollectStatus,
      readyAt: r.readyAt ? new Date(r.readyAt as string) : null,
      notifiedAt: r.notifiedAt ? new Date(r.notifiedAt as string) : null,
      pickedUpAt: r.pickedUpAt ? new Date(r.pickedUpAt as string) : null,
      expiresAt: r.expiresAt ? new Date(r.expiresAt as string) : null,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
    };
  }
}
