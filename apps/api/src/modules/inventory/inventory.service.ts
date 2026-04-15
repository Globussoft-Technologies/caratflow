// ─── Inventory Service ─────────────────────────────────────────
// Core CRUD and business logic for stock management.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  CreateStockItem,
  UpdateStockItem,
  CreateStockMovement,
  CreateStockTransfer,
  CreateStockTake,
  StockTakeItemInput,
  StockItemListInput,
  StockMovementListInput,
  StockTransferListInput,
  StockTakeListInput,
  MetalStockAdjust,
  StoneStockInput,
  StoneStockAdjust,
  CreateBatchLot,
  CreateSerialNumber,
  UpdateSerialStatus,
  SerialNumberListInput,
  BatchLotListInput,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { MovementType } from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class InventoryService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Stock Items ──────────────────────────────────────────────

  async createStockItem(tenantId: string, userId: string, input: CreateStockItem) {
    // Check for existing stock item at same product+location
    const existing = await this.prisma.stockItem.findFirst({
      where: this.tenantWhere(tenantId, {
        productId: input.productId,
        locationId: input.locationId,
      }),
    });
    if (existing) {
      throw new BadRequestException('Stock item already exists for this product at this location');
    }

    const stockItem = await this.prisma.stockItem.create({
      data: {
        id: uuid(),
        tenantId,
        productId: input.productId,
        locationId: input.locationId,
        quantityOnHand: input.quantityOnHand ?? 0,
        quantityReserved: input.quantityReserved ?? 0,
        quantityOnOrder: input.quantityOnOrder ?? 0,
        reorderLevel: input.reorderLevel ?? 0,
        reorderQuantity: input.reorderQuantity ?? 0,
        binLocation: input.binLocation ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { product: true, location: true },
    });

    await this.eventBus.publish({
      id: uuid(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.item.created',
      payload: {
        productId: input.productId,
        locationId: input.locationId,
        quantity: input.quantityOnHand ?? 0,
      },
    });

    return this.mapStockItemResponse(stockItem);
  }

  async findAllStockItems(tenantId: string, input: StockItemListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, locationId, categoryId, productType, lowStockOnly, search } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (locationId) where.locationId = locationId;
    if (productType || categoryId || search) {
      const productWhere: Record<string, unknown> = {};
      if (productType) productWhere.productType = productType;
      if (categoryId) productWhere.categoryId = categoryId;
      if (search) {
        productWhere.OR = [
          { name: { contains: search } },
          { sku: { contains: search } },
        ];
      }
      where.product = productWhere;
    }
    if (lowStockOnly) {
      // Raw comparison: quantityOnHand <= reorderLevel AND reorderLevel > 0
      where.reorderLevel = { gt: 0 };
      where.quantityOnHand = { lte: this.prisma.$queryRaw`stock_items.reorder_level` };
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder } : { updatedAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.stockItem.findMany({
        where: lowStockOnly
          ? { ...where, quantityOnHand: undefined, reorderLevel: undefined }
          : where,
        include: {
          product: { select: { id: true, sku: true, name: true, productType: true, costPricePaise: true, sellingPricePaise: true, categoryId: true } },
          location: { select: { id: true, name: true, locationType: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.stockItem.count({ where: lowStockOnly ? { ...where, quantityOnHand: undefined, reorderLevel: undefined } : where }),
    ]);

    // Filter low stock in application layer for simplicity
    const filtered = lowStockOnly
      ? items.filter((item) => item.reorderLevel > 0 && item.quantityOnHand <= item.reorderLevel)
      : items;

    const mappedItems = filtered.map((item) => this.mapStockItemResponse(item));
    const totalPages = Math.ceil(total / limit);

    return {
      items: mappedItems,
      total: lowStockOnly ? filtered.length : total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async findStockItemById(tenantId: string, id: string) {
    const item = await this.prisma.stockItem.findFirst({
      where: this.tenantWhere(tenantId, { id }),
      include: {
        product: { select: { id: true, sku: true, name: true, productType: true, costPricePaise: true, sellingPricePaise: true } },
        location: { select: { id: true, name: true, locationType: true } },
        movements: {
          orderBy: { movedAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!item) throw new NotFoundException('Stock item not found');
    return this.mapStockItemResponse(item);
  }

  async updateStockItem(tenantId: string, userId: string, id: string, input: UpdateStockItem) {
    const existing = await this.prisma.stockItem.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!existing) throw new NotFoundException('Stock item not found');

    const updated = await this.prisma.stockItem.update({
      where: { id },
      data: {
        ...input,
        updatedBy: userId,
      },
      include: {
        product: { select: { id: true, sku: true, name: true, productType: true, costPricePaise: true, sellingPricePaise: true } },
        location: { select: { id: true, name: true, locationType: true } },
      },
    });

    await this.eventBus.publish({
      id: uuid(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.item.updated',
      payload: { productId: updated.productId, changes: input as Record<string, unknown> },
    });

    return this.mapStockItemResponse(updated);
  }

  // ─── Stock Movements ─────────────────────────────────────────

  async recordMovement(tenantId: string, userId: string, input: CreateStockMovement) {
    const stockItem = await this.prisma.stockItem.findFirst({
      where: this.tenantWhere(tenantId, { id: input.stockItemId }),
    });
    if (!stockItem) throw new NotFoundException('Stock item not found');

    const newQuantity = stockItem.quantityOnHand + input.quantityChange;
    if (newQuantity < 0) {
      throw new BadRequestException(
        `Insufficient stock: current ${stockItem.quantityOnHand}, change ${input.quantityChange}`,
      );
    }

    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          id: uuid(),
          tenantId,
          stockItemId: input.stockItemId,
          movementType: input.movementType,
          quantityChange: input.quantityChange,
          referenceType: input.referenceType ?? null,
          referenceId: input.referenceId ?? null,
          notes: input.notes ?? null,
          movedAt: input.movedAt ?? new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          stockItem: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.stockItem.update({
        where: { id: input.stockItemId },
        data: {
          quantityOnHand: newQuantity,
          updatedBy: userId,
        },
      }),
    ]);

    await this.eventBus.publish({
      id: uuid(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.stock.adjusted',
      payload: {
        productId: stockItem.productId,
        locationId: stockItem.locationId,
        quantityChange: input.quantityChange,
        reason: input.notes ?? input.movementType,
      },
    });

    return movement;
  }

  async findAllMovements(tenantId: string, input: StockMovementListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, stockItemId, productId, locationId, movementType, dateRange } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (stockItemId) where.stockItemId = stockItemId;
    if (movementType) where.movementType = movementType;
    if (dateRange) {
      where.movedAt = { gte: dateRange.from, lte: dateRange.to };
    }
    if (productId || locationId) {
      const stockItemWhere: Record<string, unknown> = {};
      if (productId) stockItemWhere.productId = productId;
      if (locationId) stockItemWhere.locationId = locationId;
      where.stockItem = stockItemWhere;
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder } : { movedAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          stockItem: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  // ─── Stock Transfers ──────────────────────────────────────────

  async createTransfer(tenantId: string, userId: string, input: CreateStockTransfer) {
    if (input.fromLocationId === input.toLocationId) {
      throw new BadRequestException('Source and destination locations must be different');
    }

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        id: uuid(),
        tenantId,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        status: 'DRAFT',
        requestedBy: userId,
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
        items: {
          create: input.items.map((item) => ({
            id: uuid(),
            tenantId,
            productId: item.productId,
            quantityRequested: item.quantityRequested,
            createdBy: userId,
            updatedBy: userId,
          })),
        },
      },
      include: {
        fromLocation: { select: { id: true, name: true } },
        toLocation: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
    });

    return transfer;
  }

  async approveTransfer(tenantId: string, userId: string, transferId: string) {
    const transfer = await this.findTransferOrThrow(tenantId, transferId);
    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot approve transfer in status: ${transfer.status}`);
    }

    // Validate stock availability at source
    for (const item of transfer.items) {
      const stockItem = await this.prisma.stockItem.findFirst({
        where: this.tenantWhere(tenantId, {
          productId: item.productId,
          locationId: transfer.fromLocationId,
        }),
      });
      if (!stockItem || stockItem.quantityOnHand < item.quantityRequested) {
        throw new BadRequestException(
          `Insufficient stock for product ${item.productId} at source location`,
        );
      }
    }

    const updated = await this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: 'IN_TRANSIT',
        approvedBy: userId,
        updatedBy: userId,
      },
      include: {
        fromLocation: { select: { id: true, name: true } },
        toLocation: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
    });

    // Decrement stock at source location
    for (const item of transfer.items) {
      const stockItem = await this.prisma.stockItem.findFirst({
        where: this.tenantWhere(tenantId, {
          productId: item.productId,
          locationId: transfer.fromLocationId,
        }),
      });
      if (stockItem) {
        await this.recordMovement(tenantId, userId, {
          stockItemId: stockItem.id,
          movementType: MovementType.TRANSFER,
          quantityChange: -item.quantityRequested,
          referenceType: 'STOCK_TRANSFER',
          referenceId: transferId,
          notes: `Transfer to ${updated.toLocation?.name ?? transfer.toLocationId}`,
        });

        await this.prisma.stockTransferItem.update({
          where: { id: item.id },
          data: { quantitySent: item.quantityRequested, updatedBy: userId },
        });
      }
    }

    return updated;
  }

  async receiveTransfer(tenantId: string, userId: string, transferId: string) {
    const transfer = await this.findTransferOrThrow(tenantId, transferId);
    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException(`Cannot receive transfer in status: ${transfer.status}`);
    }

    const updated = await this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: { status: 'RECEIVED', updatedBy: userId },
      include: {
        fromLocation: { select: { id: true, name: true } },
        toLocation: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
    });

    // Add stock at destination location
    const eventItems: Array<{ productId: string; quantity: number }> = [];
    for (const item of transfer.items) {
      let destStockItem = await this.prisma.stockItem.findFirst({
        where: this.tenantWhere(tenantId, {
          productId: item.productId,
          locationId: transfer.toLocationId,
        }),
      });

      if (!destStockItem) {
        destStockItem = await this.prisma.stockItem.create({
          data: {
            id: uuid(),
            tenantId,
            productId: item.productId,
            locationId: transfer.toLocationId,
            quantityOnHand: 0,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }

      await this.recordMovement(tenantId, userId, {
        stockItemId: destStockItem.id,
        movementType: MovementType.TRANSFER,
        quantityChange: item.quantitySent,
        referenceType: 'STOCK_TRANSFER',
        referenceId: transferId,
        notes: `Transfer from ${updated.fromLocation?.name ?? transfer.fromLocationId}`,
      });

      await this.prisma.stockTransferItem.update({
        where: { id: item.id },
        data: { quantityReceived: item.quantitySent, updatedBy: userId },
      });

      eventItems.push({ productId: item.productId, quantity: item.quantitySent });
    }

    await this.eventBus.publish({
      id: uuid(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.transfer.completed',
      payload: {
        transferId,
        fromLocationId: transfer.fromLocationId,
        toLocationId: transfer.toLocationId,
        items: eventItems,
      },
    });

    return updated;
  }

  async cancelTransfer(tenantId: string, userId: string, transferId: string) {
    const transfer = await this.findTransferOrThrow(tenantId, transferId);
    if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel transfer in status: ${transfer.status}`);
    }

    // If in transit, reverse the stock deductions at source
    if (transfer.status === 'IN_TRANSIT') {
      for (const item of transfer.items) {
        const stockItem = await this.prisma.stockItem.findFirst({
          where: this.tenantWhere(tenantId, {
            productId: item.productId,
            locationId: transfer.fromLocationId,
          }),
        });
        if (stockItem) {
          await this.recordMovement(tenantId, userId, {
            stockItemId: stockItem.id,
            movementType: MovementType.RETURN,
            quantityChange: item.quantitySent,
            referenceType: 'STOCK_TRANSFER_CANCEL',
            referenceId: transferId,
            notes: 'Transfer cancelled - stock returned',
          });
        }
      }
    }

    return this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: { status: 'CANCELLED', updatedBy: userId },
      include: {
        fromLocation: { select: { id: true, name: true } },
        toLocation: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
    });
  }

  async findAllTransfers(tenantId: string, input: StockTransferListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, status, fromLocationId, toLocationId } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (fromLocationId) where.fromLocationId = fromLocationId;
    if (toLocationId) where.toLocationId = toLocationId;

    const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        include: {
          fromLocation: { select: { id: true, name: true } },
          toLocation: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, sku: true, name: true } } },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  private async findTransferOrThrow(tenantId: string, transferId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: this.tenantWhere(tenantId, { id: transferId }),
      include: {
        fromLocation: { select: { id: true, name: true } },
        toLocation: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
    });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    return transfer;
  }

  // ─── Stock Takes ──────────────────────────────────────────────

  async createStockTake(tenantId: string, userId: string, input: CreateStockTake) {
    // Get all stock items at the location to pre-populate system quantities
    const stockItems = await this.prisma.stockItem.findMany({
      where: this.tenantWhere(tenantId, { locationId: input.locationId }),
      include: { product: { select: { id: true, sku: true, name: true } } },
    });

    const stockTake = await this.prisma.stockTake.create({
      data: {
        id: uuid(),
        tenantId,
        locationId: input.locationId,
        status: 'DRAFT',
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
        items: {
          create: stockItems.map((si) => ({
            id: uuid(),
            tenantId,
            productId: si.productId,
            systemQuantity: si.quantityOnHand,
            createdBy: userId,
            updatedBy: userId,
          })),
        },
      },
      include: {
        location: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
    });

    return stockTake;
  }

  async addStockTakeCounts(tenantId: string, userId: string, stockTakeId: string, counts: StockTakeItemInput[]) {
    const stockTake = await this.prisma.stockTake.findFirst({
      where: this.tenantWhere(tenantId, { id: stockTakeId }),
    });
    if (!stockTake) throw new NotFoundException('Stock take not found');
    if (stockTake.status === 'COMPLETED' || stockTake.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot add counts to stock take in status: ${stockTake.status}`);
    }

    // Set to IN_PROGRESS if still DRAFT
    if (stockTake.status === 'DRAFT') {
      await this.prisma.stockTake.update({
        where: { id: stockTakeId },
        data: { status: 'IN_PROGRESS', startedAt: new Date(), updatedBy: userId },
      });
    }

    // Update counts for each item
    for (const count of counts) {
      const item = await this.prisma.stockTakeItem.findFirst({
        where: { stockTakeId, productId: count.productId, tenantId },
      });
      if (item) {
        const variance = count.countedQuantity - item.systemQuantity;
        await this.prisma.stockTakeItem.update({
          where: { id: item.id },
          data: {
            countedQuantity: count.countedQuantity,
            varianceQuantity: variance,
            notes: count.notes ?? null,
            updatedBy: userId,
          },
        });
      }
    }

    return this.prisma.stockTake.findFirst({
      where: { id: stockTakeId },
      include: {
        location: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
    });
  }

  async completeStockTake(tenantId: string, userId: string, stockTakeId: string) {
    const stockTake = await this.prisma.stockTake.findFirst({
      where: this.tenantWhere(tenantId, { id: stockTakeId }),
      include: { items: true },
    });
    if (!stockTake) throw new NotFoundException('Stock take not found');
    if (stockTake.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Cannot complete stock take in status: ${stockTake.status}`);
    }

    // Check all items have been counted
    const uncounted = stockTake.items.filter((item) => item.countedQuantity === null);
    if (uncounted.length > 0) {
      throw new BadRequestException(`${uncounted.length} items have not been counted yet`);
    }

    // Apply adjustments for any variances
    for (const item of stockTake.items) {
      if (item.varianceQuantity && item.varianceQuantity !== 0) {
        const stockItem = await this.prisma.stockItem.findFirst({
          where: this.tenantWhere(tenantId, {
            productId: item.productId,
            locationId: stockTake.locationId,
          }),
        });
        if (stockItem) {
          await this.recordMovement(tenantId, userId, {
            stockItemId: stockItem.id,
            movementType: MovementType.ADJUST,
            quantityChange: item.varianceQuantity,
            referenceType: 'STOCK_TAKE',
            referenceId: stockTakeId,
            notes: `Stock take adjustment: variance of ${item.varianceQuantity}`,
          });
        }
      }
    }

    // Update stock item lastCountedAt
    await this.prisma.stockItem.updateMany({
      where: this.tenantWhere(tenantId, { locationId: stockTake.locationId }),
      data: { lastCountedAt: new Date(), updatedBy: userId },
    });

    return this.prisma.stockTake.update({
      where: { id: stockTakeId },
      data: { status: 'COMPLETED', completedAt: new Date(), updatedBy: userId },
      include: {
        location: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
    });
  }

  async findAllStockTakes(tenantId: string, input: StockTakeListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, locationId, status } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;

    const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.stockTake.findMany({
        where,
        include: {
          location: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, sku: true, name: true } } },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.stockTake.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  // ─── Metal Stock ──────────────────────────────────────────────

  async getMetalStockByLocation(tenantId: string, locationId: string) {
    return this.prisma.metalStock.findMany({
      where: this.tenantWhere(tenantId, { locationId }),
      include: { location: { select: { id: true, name: true } } },
      orderBy: [{ metalType: 'asc' }, { purityFineness: 'desc' }],
    });
  }

  async adjustMetalStock(tenantId: string, userId: string, input: MetalStockAdjust) {
    let metalStock = await this.prisma.metalStock.findFirst({
      where: this.tenantWhere(tenantId, {
        locationId: input.locationId,
        metalType: input.metalType,
        purityFineness: input.purityFineness,
      }),
    });

    if (metalStock) {
      const newWeight = BigInt(metalStock.weightMg) + input.weightChangeMg;
      const newValue = BigInt(metalStock.valuePaise) + input.valueChangePaise;
      if (newWeight < 0n) throw new BadRequestException('Metal stock weight cannot go below zero');

      metalStock = await this.prisma.metalStock.update({
        where: { id: metalStock.id },
        data: {
          weightMg: newWeight,
          valuePaise: newValue < 0n ? 0n : newValue,
          updatedBy: userId,
        },
      });
    } else {
      if (input.weightChangeMg < 0n) throw new BadRequestException('Cannot deduct from non-existent metal stock');

      metalStock = await this.prisma.metalStock.create({
        data: {
          id: uuid(),
          tenantId,
          locationId: input.locationId,
          metalType: input.metalType,
          purityFineness: input.purityFineness,
          weightMg: input.weightChangeMg,
          valuePaise: input.valueChangePaise < 0n ? 0n : input.valueChangePaise,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }

    return metalStock;
  }

  // ─── Stone Stock ──────────────────────────────────────────────

  async getStoneStockByLocation(tenantId: string, locationId: string) {
    return this.prisma.stoneStock.findMany({
      where: this.tenantWhere(tenantId, { locationId }),
      include: { location: { select: { id: true, name: true } } },
      orderBy: { stoneType: 'asc' },
    });
  }

  async createStoneStock(tenantId: string, userId: string, input: StoneStockInput) {
    return this.prisma.stoneStock.create({
      data: {
        id: uuid(),
        tenantId,
        locationId: input.locationId,
        stoneType: input.stoneType,
        shape: input.shape ?? null,
        sizeRange: input.sizeRange ?? null,
        color: input.color ?? null,
        clarity: input.clarity ?? null,
        cutGrade: input.cutGrade ?? null,
        totalWeightCt: input.totalWeightCt,
        totalPieces: input.totalPieces,
        valuePaise: input.valuePaise,
        certificationNumber: input.certificationNumber ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { location: { select: { id: true, name: true } } },
    });
  }

  async adjustStoneStock(tenantId: string, userId: string, input: StoneStockAdjust) {
    const stone = await this.prisma.stoneStock.findFirst({
      where: this.tenantWhere(tenantId, { id: input.id }),
    });
    if (!stone) throw new NotFoundException('Stone stock not found');

    const newWeight = stone.totalWeightCt + input.weightChangeCt;
    const newPieces = stone.totalPieces + input.piecesChange;
    const newValue = BigInt(stone.valuePaise) + input.valueChangePaise;

    if (newWeight < 0 || newPieces < 0) {
      throw new BadRequestException('Stone stock weight/pieces cannot go below zero');
    }

    return this.prisma.stoneStock.update({
      where: { id: input.id },
      data: {
        totalWeightCt: newWeight,
        totalPieces: newPieces,
        valuePaise: newValue < 0n ? 0n : newValue,
        updatedBy: userId,
      },
      include: { location: { select: { id: true, name: true } } },
    });
  }

  // ─── Batch/Lot ────────────────────────────────────────────────

  async createBatchLot(tenantId: string, userId: string, input: CreateBatchLot) {
    return this.prisma.batchLot.create({
      data: {
        id: uuid(),
        tenantId,
        productId: input.productId,
        batchNumber: input.batchNumber,
        lotNumber: input.lotNumber ?? null,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        quantityInitial: input.quantityInitial,
        quantityCurrent: input.quantityInitial,
        expiryDate: input.expiryDate ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { product: { select: { id: true, sku: true, name: true } } },
    });
  }

  async findBatchLotsByProduct(tenantId: string, input: BatchLotListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, productId } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (productId) where.productId = productId;

    const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.batchLot.findMany({
        where,
        include: { product: { select: { id: true, sku: true, name: true } } },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.batchLot.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  async adjustBatchLotQuantity(tenantId: string, userId: string, batchLotId: string, quantityChange: number) {
    const batch = await this.prisma.batchLot.findFirst({
      where: this.tenantWhere(tenantId, { id: batchLotId }),
    });
    if (!batch) throw new NotFoundException('Batch lot not found');

    const newQuantity = batch.quantityCurrent + quantityChange;
    if (newQuantity < 0) throw new BadRequestException('Batch lot quantity cannot go below zero');

    return this.prisma.batchLot.update({
      where: { id: batchLotId },
      data: { quantityCurrent: newQuantity, updatedBy: userId },
      include: { product: { select: { id: true, sku: true, name: true } } },
    });
  }

  // ─── Serial Numbers ──────────────────────────────────────────

  async createSerialNumber(tenantId: string, userId: string, input: CreateSerialNumber) {
    const existing = await this.prisma.serialNumber.findFirst({
      where: this.tenantWhere(tenantId, { serialNumber: input.serialNumber }),
    });
    if (existing) throw new BadRequestException('Serial number already exists');

    return this.prisma.serialNumber.create({
      data: {
        id: uuid(),
        tenantId,
        productId: input.productId,
        serialNumber: input.serialNumber,
        batchLotId: input.batchLotId ?? null,
        locationId: input.locationId ?? null,
        status: 'AVAILABLE',
        rfidTag: input.rfidTag ?? null,
        barcodeData: input.barcodeData ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
  }

  async updateSerialNumberStatus(tenantId: string, userId: string, input: UpdateSerialStatus) {
    const serial = await this.prisma.serialNumber.findFirst({
      where: this.tenantWhere(tenantId, { id: input.id }),
    });
    if (!serial) throw new NotFoundException('Serial number not found');

    return this.prisma.serialNumber.update({
      where: { id: input.id },
      data: {
        status: input.status,
        locationId: input.locationId ?? serial.locationId,
        updatedBy: userId,
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
  }

  async findSerialByNumber(tenantId: string, serialNumber: string) {
    const serial = await this.prisma.serialNumber.findFirst({
      where: this.tenantWhere(tenantId, { serialNumber }),
      include: {
        product: { select: { id: true, sku: true, name: true } },
        location: { select: { id: true, name: true } },
        batchLot: true,
      },
    });
    if (!serial) throw new NotFoundException('Serial number not found');
    return serial;
  }

  async findAllSerialNumbers(tenantId: string, input: SerialNumberListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, productId, locationId, status, search } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (productId) where.productId = productId;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { serialNumber: { contains: search } },
        { rfidTag: { contains: search } },
        { barcodeData: { contains: search } },
      ];
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.serialNumber.findMany({
        where,
        include: {
          product: { select: { id: true, sku: true, name: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.serialNumber.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  // ─── Dashboard ────────────────────────────────────────────────

  async getDashboard(tenantId: string) {
    const [
      stockItems,
      lowStockItems,
      pendingTransfers,
      metalStocks,
      stoneStocks,
      recentMovements,
    ] = await Promise.all([
      this.prisma.stockItem.findMany({
        where: { tenantId },
        include: {
          product: { select: { id: true, sku: true, name: true, costPricePaise: true } },
          location: { select: { id: true, name: true } },
        },
      }),
      this.prisma.stockItem.findMany({
        where: {
          tenantId,
          reorderLevel: { gt: 0 },
        },
        include: {
          product: { select: { id: true, sku: true, name: true } },
          location: { select: { id: true, name: true } },
        },
      }),
      this.prisma.stockTransfer.count({
        where: { tenantId, status: { in: ['DRAFT', 'IN_TRANSIT'] } },
      }),
      this.prisma.metalStock.findMany({ where: { tenantId } }),
      this.prisma.stoneStock.findMany({ where: { tenantId } }),
      this.prisma.stockMovement.findMany({
        where: { tenantId },
        include: {
          stockItem: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { movedAt: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate total stock value
    let totalStockValuePaise = 0n;
    for (const item of stockItems) {
      if (item.product.costPricePaise) {
        totalStockValuePaise += BigInt(item.product.costPricePaise) * BigInt(item.quantityOnHand);
      }
    }

    // Low stock alerts (filter in app layer)
    const lowStockAlerts = lowStockItems
      .filter((item) => item.quantityOnHand <= item.reorderLevel)
      .map((item) => ({
        stockItemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        locationName: item.location.name,
        quantityOnHand: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
      }));

    // Metal breakdown
    const metalBreakdown = metalStocks.map((ms) => ({
      metalType: ms.metalType as 'GOLD' | 'SILVER' | 'PLATINUM',
      purityFineness: ms.purityFineness,
      totalWeightMg: ms.weightMg,
      totalValuePaise: ms.valuePaise,
    }));

    // Stone breakdown (group by type)
    const stoneMap = new Map<string, { totalWeightCt: number; totalPieces: number; totalValuePaise: bigint }>();
    for (const ss of stoneStocks) {
      const existing = stoneMap.get(ss.stoneType) ?? { totalWeightCt: 0, totalPieces: 0, totalValuePaise: 0n };
      existing.totalWeightCt += ss.totalWeightCt;
      existing.totalPieces += ss.totalPieces;
      existing.totalValuePaise += BigInt(ss.valuePaise);
      stoneMap.set(ss.stoneType, existing);
    }
    const stoneBreakdown = Array.from(stoneMap.entries()).map(([stoneType, data]) => ({
      stoneType,
      ...data,
    }));

    return {
      totalStockValuePaise,
      totalSKUs: stockItems.length,
      lowStockAlerts,
      pendingTransfers,
      metalBreakdown,
      stoneBreakdown,
      recentMovements,
    };
  }

  /**
   * Fetch a product together with its stock aggregated across all
   * locations for the tenant. Used by the mobile Sales app
   * product-detail screen.
   */
  async getProductWithStock(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: productId }) as {
        tenantId: string;
        id: string;
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const stockItems = await this.prisma.stockItem.findMany({
      where: this.tenantWhere(tenantId, { productId }) as {
        tenantId: string;
        productId: string;
      },
      include: { location: { select: { id: true, name: true } } },
    });

    const productType = product.productType as unknown as string;
    const metalType =
      productType === 'GOLD_JEWELRY'
        ? 'GOLD'
        : productType === 'SILVER_JEWELRY'
          ? 'SILVER'
          : productType === 'PLATINUM_JEWELRY'
            ? 'PLATINUM'
            : null;

    // Product has no hsnCode column today — 7113 is the default HSN for
    // articles of jewellery in India.
    const hsnCode = '7113';

    const images = Array.isArray(product.images)
      ? (product.images as unknown[]).filter(
          (v): v is string => typeof v === 'string',
        )
      : [];

    return {
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        productType,
        description: product.description ?? null,
        metalType,
        purityFineness: product.metalPurity ?? 0,
        weightMg: product.metalWeightMg ? Number(product.metalWeightMg) : 0,
        costPricePaise: product.costPricePaise
          ? Number(product.costPricePaise)
          : 0,
        sellingPricePaise: product.sellingPricePaise
          ? Number(product.sellingPricePaise)
          : 0,
        hsnCode,
        images,
      },
      stockByLocation: stockItems.map((si) => {
        const quantityAvailable = si.quantityOnHand - si.quantityReserved;
        return {
          locationId: si.locationId,
          locationName: si.location.name,
          quantity: si.quantityOnHand,
          reservedQuantity: si.quantityReserved,
          quantityOnHand: si.quantityOnHand,
          quantityAvailable,
        };
      }),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private mapStockItemResponse(item: Record<string, unknown>) {
    const raw = item as {
      id: string;
      tenantId: string;
      productId: string;
      locationId: string;
      quantityOnHand: number;
      quantityReserved: number;
      quantityOnOrder: number;
      reorderLevel: number;
      reorderQuantity: number;
      lastCountedAt: Date | null;
      binLocation: string | null;
      createdAt: Date;
      updatedAt: Date;
      product?: unknown;
      location?: unknown;
      movements?: unknown[];
    };

    return {
      ...raw,
      quantityAvailable: raw.quantityOnHand - raw.quantityReserved,
    };
  }
}
