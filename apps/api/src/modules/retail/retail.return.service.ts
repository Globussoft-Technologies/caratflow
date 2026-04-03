// ─── Retail Return Service ─────────────────────────────────────
// Handles sale returns, rate difference calculations, and refunds.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { SaleReturnInput, SaleReturnResponse } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { SaleReturnStatus } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RetailReturnService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  private async generateReturnNumber(tenantId: string, locationId: string): Promise<string> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
      select: { city: true },
    });
    const locCode = (location?.city ?? 'LOC').substring(0, 3).toUpperCase();
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.saleReturn.count({
      where: {
        tenantId,
        locationId,
        returnNumber: { contains: `/${locCode}/${yymm}/` },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `RT/${locCode}/${yymm}/${seq}`;
  }

  /**
   * Create a return against an original sale.
   * Calculates metal rate difference if gold price has changed since purchase.
   */
  async createReturn(tenantId: string, userId: string, input: SaleReturnInput): Promise<SaleReturnResponse> {
    // Verify original sale exists and is completed
    const originalSale = await this.prisma.sale.findFirst({
      where: this.tenantWhere(tenantId, { id: input.originalSaleId }) as { tenantId: string; id: string },
      include: { lineItems: true },
    });

    if (!originalSale) {
      throw new NotFoundException('Original sale not found');
    }

    if (originalSale.status !== 'COMPLETED' && originalSale.status !== 'PARTIALLY_RETURNED') {
      throw new BadRequestException('Sale is not eligible for return');
    }

    // Validate return items match original sale line items
    const originalItemMap = new Map(
      originalSale.lineItems.map((li) => [li.id, li]),
    );

    let subtotalPaise = 0;
    let metalRateDifferencePaise = 0;

    for (const returnItem of input.items) {
      const originalItem = originalItemMap.get(returnItem.originalLineItemId);
      if (!originalItem) {
        throw new BadRequestException(
          `Line item ${returnItem.originalLineItemId} not found in original sale`,
        );
      }
      if (returnItem.quantity > originalItem.quantity) {
        throw new BadRequestException(
          `Return quantity exceeds original quantity for item ${returnItem.originalLineItemId}`,
        );
      }
      subtotalPaise += returnItem.returnPricePaise * returnItem.quantity;

      // Calculate metal rate difference (current rate vs sale rate)
      // If current rate is higher, customer gets more back; if lower, they get less.
      // For now, use the return price as-is -- the frontend should compute the adjusted price.
      const originalLineTotal = Number(originalItem.lineTotalPaise);
      const originalPerUnit = Math.round(originalLineTotal / originalItem.quantity);
      metalRateDifferencePaise += (returnItem.returnPricePaise - originalPerUnit) * returnItem.quantity;
    }

    const returnNumber = await this.generateReturnNumber(tenantId, input.locationId);
    const returnId = uuidv4();

    await this.prisma.$transaction(async (tx) => {
      await tx.saleReturn.create({
        data: {
          id: returnId,
          tenantId,
          returnNumber,
          originalSaleId: input.originalSaleId,
          customerId: input.customerId ?? originalSale.customerId,
          locationId: input.locationId,
          reason: input.reason ?? null,
          status: 'DRAFT',
          subtotalPaise: BigInt(subtotalPaise),
          refundAmountPaise: BigInt(subtotalPaise),
          refundMethod: input.refundMethod ?? null,
          metalRateDifferencePaise: BigInt(metalRateDifferencePaise),
          createdBy: userId,
          updatedBy: userId,
        },
      });

      for (const item of input.items) {
        await tx.saleReturnItem.create({
          data: {
            id: uuidv4(),
            tenantId,
            returnId,
            originalLineItemId: item.originalLineItemId,
            productId: item.productId ?? null,
            quantity: item.quantity,
            returnPricePaise: BigInt(item.returnPricePaise),
            reason: item.reason ?? null,
          },
        });
      }
    });

    return this.getReturn(tenantId, returnId);
  }

  /**
   * Approve a return.
   */
  async approveReturn(tenantId: string, userId: string, returnId: string): Promise<SaleReturnResponse> {
    const saleReturn = await this.prisma.saleReturn.findFirst({
      where: this.tenantWhere(tenantId, { id: returnId }) as { tenantId: string; id: string },
    });

    if (!saleReturn) throw new NotFoundException('Return not found');
    if (saleReturn.status !== 'DRAFT') throw new BadRequestException('Return must be in DRAFT status to approve');

    await this.prisma.saleReturn.update({
      where: { id: returnId },
      data: { status: 'APPROVED', updatedBy: userId },
    });

    return this.getReturn(tenantId, returnId);
  }

  /**
   * Complete a return and update the original sale status.
   */
  async completeReturn(tenantId: string, userId: string, returnId: string): Promise<SaleReturnResponse> {
    const saleReturn = await this.prisma.saleReturn.findFirst({
      where: this.tenantWhere(tenantId, { id: returnId }) as { tenantId: string; id: string },
      include: { items: true },
    });

    if (!saleReturn) throw new NotFoundException('Return not found');
    if (saleReturn.status !== 'APPROVED') throw new BadRequestException('Return must be approved before completing');

    await this.prisma.$transaction(async (tx) => {
      await tx.saleReturn.update({
        where: { id: returnId },
        data: { status: 'COMPLETED', updatedBy: userId },
      });

      // Determine if the original sale is fully or partially returned
      const allReturns = await tx.saleReturnItem.findMany({
        where: { tenantId, saleReturn: { originalSaleId: saleReturn.originalSaleId, status: 'COMPLETED' } },
      });
      const currentReturnItems = saleReturn.items;
      const totalReturnedItems = [...allReturns, ...currentReturnItems];

      const originalSale = await tx.sale.findUnique({
        where: { id: saleReturn.originalSaleId },
        include: { lineItems: true },
      });

      if (originalSale) {
        const originalQty = originalSale.lineItems.reduce((sum, li) => sum + li.quantity, 0);
        const returnedQty = totalReturnedItems.reduce((sum, ri) => sum + ri.quantity, 0);
        const newStatus = returnedQty >= originalQty ? 'RETURNED' : 'PARTIALLY_RETURNED';

        await tx.sale.update({
          where: { id: saleReturn.originalSaleId },
          data: { status: newStatus, updatedBy: userId },
        });
      }
    });

    // Publish event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'retail.return.processed',
      payload: {
        returnId,
        originalSaleId: saleReturn.originalSaleId,
        refundPaise: Number(saleReturn.refundAmountPaise),
      },
    });

    return this.getReturn(tenantId, returnId);
  }

  /**
   * Reject a return.
   */
  async rejectReturn(tenantId: string, userId: string, returnId: string, reason: string): Promise<SaleReturnResponse> {
    const saleReturn = await this.prisma.saleReturn.findFirst({
      where: this.tenantWhere(tenantId, { id: returnId }) as { tenantId: string; id: string },
    });

    if (!saleReturn) throw new NotFoundException('Return not found');

    await this.prisma.saleReturn.update({
      where: { id: returnId },
      data: {
        status: 'REJECTED',
        reason: saleReturn.reason ? `${saleReturn.reason}\nREJECTED: ${reason}` : `REJECTED: ${reason}`,
        updatedBy: userId,
      },
    });

    return this.getReturn(tenantId, returnId);
  }

  async getReturn(tenantId: string, returnId: string): Promise<SaleReturnResponse> {
    const saleReturn = await this.prisma.saleReturn.findFirst({
      where: this.tenantWhere(tenantId, { id: returnId }) as { tenantId: string; id: string },
      include: { items: true },
    });

    if (!saleReturn) throw new NotFoundException('Return not found');

    return {
      id: saleReturn.id,
      tenantId: saleReturn.tenantId,
      returnNumber: saleReturn.returnNumber,
      originalSaleId: saleReturn.originalSaleId,
      customerId: saleReturn.customerId,
      locationId: saleReturn.locationId,
      reason: saleReturn.reason,
      status: saleReturn.status as SaleReturnStatus,
      subtotalPaise: Number(saleReturn.subtotalPaise),
      refundAmountPaise: Number(saleReturn.refundAmountPaise),
      refundMethod: saleReturn.refundMethod,
      metalRateDifferencePaise: Number(saleReturn.metalRateDifferencePaise),
      items: saleReturn.items.map((item) => ({
        id: item.id,
        originalLineItemId: item.originalLineItemId,
        productId: item.productId,
        quantity: item.quantity,
        returnPricePaise: Number(item.returnPricePaise),
        reason: item.reason,
      })),
      createdAt: saleReturn.createdAt,
      updatedAt: saleReturn.updatedAt,
    };
  }

  async listReturns(
    tenantId: string,
    filters: { status?: string; originalSaleId?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<SaleReturnResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.originalSaleId) where.originalSaleId = filters.originalSaleId;

    const [items, total] = await Promise.all([
      this.prisma.saleReturn.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.saleReturn.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        returnNumber: r.returnNumber,
        originalSaleId: r.originalSaleId,
        customerId: r.customerId,
        locationId: r.locationId,
        reason: r.reason,
        status: r.status as SaleReturnStatus,
        subtotalPaise: Number(r.subtotalPaise),
        refundAmountPaise: Number(r.refundAmountPaise),
        refundMethod: r.refundMethod,
        metalRateDifferencePaise: Number(r.metalRateDifferencePaise),
        items: r.items.map((item) => ({
          id: item.id,
          originalLineItemId: item.originalLineItemId,
          productId: item.productId,
          quantity: item.quantity,
          returnPricePaise: Number(item.returnPricePaise),
          reason: item.reason,
        })),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }
}
