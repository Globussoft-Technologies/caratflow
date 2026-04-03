// ─── E-Commerce Shipping Service ──────────────────────────────
// Create shipment, generate label (placeholder for Shiprocket/
// Delhivery API), track shipment, update delivery status.

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import type {
  ShipmentInput,
  ShipmentResponse,
  TrackingUpdate,
  ShipmentListFilter,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { ShipmentStatus, OnlineOrderStatus } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EcommerceShippingService extends TenantAwareService {
  private readonly logger = new Logger(EcommerceShippingService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Generate shipment number in format: SH/YYMM/SEQ
   */
  private async generateShipmentNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.shipment.count({
      where: {
        tenantId,
        shipmentNumber: { contains: `/SH/${yymm}/` },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `SH/${yymm}/${seq}`;
  }

  /**
   * Create a shipment for an order.
   */
  async createShipment(tenantId: string, userId: string, input: ShipmentInput): Promise<ShipmentResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: input.orderId, tenantId },
    });
    if (!order) {
      throw new NotFoundException('Online order not found');
    }

    if (['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.status)) {
      throw new BadRequestException(`Cannot create shipment for order in ${order.status} status`);
    }

    const shipmentNumber = await this.generateShipmentNumber(tenantId);

    const shipment = await this.prisma.shipment.create({
      data: {
        id: uuidv4(),
        tenantId,
        orderId: input.orderId,
        shipmentNumber,
        carrier: input.carrier ?? null,
        trackingNumber: input.trackingNumber ?? null,
        trackingUrl: input.trackingUrl ?? null,
        status: 'LABEL_CREATED',
        estimatedDeliveryDate: input.estimatedDeliveryDate ?? null,
        weightGrams: input.weightGrams ?? null,
        shippingCostPaise: BigInt(input.shippingCostPaise ?? 0),
        labelUrl: input.labelUrl ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Update order status to PROCESSING if it was CONFIRMED
    if (order.status === 'CONFIRMED') {
      await this.prisma.onlineOrder.update({
        where: { id: input.orderId },
        data: { status: 'PROCESSING', updatedBy: userId },
      });
    }

    this.logger.log(`Shipment created: ${shipmentNumber} for order ${order.orderNumber}`);

    return this.mapShipmentToResponse(shipment);
  }

  /**
   * Update shipment tracking information and status.
   */
  async updateTracking(tenantId: string, userId: string, update: TrackingUpdate): Promise<ShipmentResponse> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: update.shipmentId, tenantId },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const data: Record<string, unknown> = {
      status: update.status,
      updatedBy: userId,
    };

    if (update.trackingNumber) data.trackingNumber = update.trackingNumber;
    if (update.trackingUrl) data.trackingUrl = update.trackingUrl;
    if (update.actualDeliveryDate) data.actualDeliveryDate = update.actualDeliveryDate;

    // If delivered, set actual delivery date
    if (update.status === ShipmentStatus.DELIVERED && !update.actualDeliveryDate) {
      data.actualDeliveryDate = new Date();
    }

    const updated = await this.prisma.shipment.update({
      where: { id: update.shipmentId },
      data,
    });

    // Update order status based on shipment status
    if (update.status === ShipmentStatus.PICKED_UP || update.status === ShipmentStatus.IN_TRANSIT) {
      await this.prisma.onlineOrder.update({
        where: { id: shipment.orderId },
        data: {
          status: 'SHIPPED',
          shippedAt: new Date(),
          updatedBy: userId,
        },
      });
    } else if (update.status === ShipmentStatus.DELIVERED) {
      await this.prisma.onlineOrder.update({
        where: { id: shipment.orderId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          updatedBy: userId,
        },
      });
    }

    this.logger.log(`Shipment ${shipment.shipmentNumber} tracking updated: ${update.status}`);

    return this.mapShipmentToResponse(updated);
  }

  /**
   * Get a single shipment.
   */
  async getShipment(tenantId: string, shipmentId: string): Promise<ShipmentResponse> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, tenantId },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return this.mapShipmentToResponse(shipment);
  }

  /**
   * List shipments by order.
   */
  async getShipmentsByOrder(tenantId: string, orderId: string): Promise<ShipmentResponse[]> {
    const shipments = await this.prisma.shipment.findMany({
      where: { tenantId, orderId },
      orderBy: { createdAt: 'desc' },
    });
    return shipments.map((s) => this.mapShipmentToResponse(s));
  }

  /**
   * List shipments with filters and pagination.
   */
  async listShipments(
    tenantId: string,
    filters: ShipmentListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<ShipmentResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.status) where.status = filters.status;
    if (filters.carrier) where.carrier = { contains: filters.carrier };
    if (filters.search) {
      where.OR = [
        { shipmentNumber: { contains: filters.search } },
        { trackingNumber: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((s) => this.mapShipmentToResponse(s)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Placeholder: Generate shipping label via carrier API.
   * In production, integrate with Shiprocket, Delhivery, etc.
   */
  async generateLabel(
    tenantId: string,
    shipmentId: string,
    carrier: string,
  ): Promise<ShipmentResponse> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, tenantId },
      include: { order: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    // Placeholder: In production, call carrier API to generate label
    // e.g., Shiprocket: POST /v1/external/orders/create/adhoc
    this.logger.log(`[${carrier}] Generating label for shipment ${shipment.shipmentNumber}`);

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        carrier,
        labelUrl: `https://labels.example.com/${shipment.shipmentNumber}.pdf`,
      },
    });

    return this.mapShipmentToResponse(updated);
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapShipmentToResponse(s: Record<string, unknown>): ShipmentResponse {
    return {
      id: s.id as string,
      tenantId: s.tenantId as string,
      orderId: s.orderId as string,
      shipmentNumber: s.shipmentNumber as string,
      carrier: (s.carrier as string) ?? null,
      trackingNumber: (s.trackingNumber as string) ?? null,
      trackingUrl: (s.trackingUrl as string) ?? null,
      status: s.status as ShipmentStatus,
      estimatedDeliveryDate: s.estimatedDeliveryDate ? new Date(s.estimatedDeliveryDate as string) : null,
      actualDeliveryDate: s.actualDeliveryDate ? new Date(s.actualDeliveryDate as string) : null,
      weightGrams: (s.weightGrams as number) ?? null,
      shippingCostPaise: Number(s.shippingCostPaise),
      labelUrl: (s.labelUrl as string) ?? null,
      createdAt: new Date(s.createdAt as string),
      updatedAt: new Date(s.updatedAt as string),
    };
  }
}
