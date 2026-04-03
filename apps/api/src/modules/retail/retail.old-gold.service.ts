// ─── Retail Old Gold Purchase Service ──────────────────────────
// Handles old gold buying, purity testing, valuation, and exchange against sales.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { OldGoldInput, OldGoldPurchaseResponse } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { OldGoldPurchaseStatus } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RetailOldGoldService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private async generatePurchaseNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.oldGoldPurchase.count({
      where: {
        tenantId,
        purchaseNumber: { contains: `OG/${yymm}/` },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `OG/${yymm}/${seq}`;
  }

  /**
   * Calculate old gold value.
   * Formula: (netWeightMg / 10000) * ratePaisePer10g * (purityFineness / 999)
   * Then subtract deductions.
   */
  private calculateValue(
    netWeightMg: number,
    ratePaisePer10g: number,
    purityFineness: number,
    deductions?: Array<{ amountPaise: number }>,
  ): { totalValuePaise: number; finalAmountPaise: number } {
    // netWeight in 10g units: netWeightMg / 10,000 (since 10g = 10,000 mg)
    const weightIn10g = netWeightMg / 10000;
    const purityFactor = purityFineness / 999;
    const totalValuePaise = Math.round(weightIn10g * ratePaisePer10g * purityFactor);

    const totalDeductions = (deductions ?? []).reduce((sum, d) => sum + d.amountPaise, 0);
    const finalAmountPaise = Math.max(0, totalValuePaise - totalDeductions);

    return { totalValuePaise, finalAmountPaise };
  }

  async createPurchase(tenantId: string, userId: string, input: OldGoldInput): Promise<OldGoldPurchaseResponse> {
    const purchaseNumber = await this.generatePurchaseNumber(tenantId);
    const { totalValuePaise, finalAmountPaise } = this.calculateValue(
      input.netWeightMg,
      input.ratePaisePer10g,
      input.purityFineness,
      input.deductions,
    );

    const purchase = await this.prisma.oldGoldPurchase.create({
      data: {
        id: uuidv4(),
        tenantId,
        purchaseNumber,
        customerId: input.customerId ?? null,
        locationId: input.locationId,
        metalType: input.metalType,
        grossWeightMg: BigInt(input.grossWeightMg),
        netWeightMg: BigInt(input.netWeightMg),
        purityFineness: input.purityFineness,
        ratePaisePer10g: BigInt(input.ratePaisePer10g),
        totalValuePaise: BigInt(totalValuePaise),
        deductions: input.deductions ?? null,
        finalAmountPaise: BigInt(finalAmountPaise),
        paymentMethod: input.paymentMethod ?? null,
        status: 'DRAFT',
        usedAgainstSaleId: input.usedAgainstSaleId ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.getPurchase(tenantId, purchase.id);
  }

  async updateStatus(
    tenantId: string,
    userId: string,
    purchaseId: string,
    status: OldGoldPurchaseStatus,
  ): Promise<OldGoldPurchaseResponse> {
    const purchase = await this.prisma.oldGoldPurchase.findFirst({
      where: this.tenantWhere(tenantId, { id: purchaseId }) as { tenantId: string; id: string },
    });

    if (!purchase) throw new NotFoundException('Old gold purchase not found');

    // Simple validation of transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['TESTED'],
      TESTED: ['VALUED'],
      VALUED: ['PURCHASED', 'EXCHANGED'],
      PURCHASED: [],
      EXCHANGED: [],
    };

    const allowed = validTransitions[purchase.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${purchase.status} to ${status}`,
      );
    }

    await this.prisma.oldGoldPurchase.update({
      where: { id: purchaseId },
      data: { status, updatedBy: userId },
    });

    return this.getPurchase(tenantId, purchaseId);
  }

  async updateTestResults(
    tenantId: string,
    userId: string,
    purchaseId: string,
    purityFineness: number,
    netWeightMg: number,
  ): Promise<OldGoldPurchaseResponse> {
    const purchase = await this.prisma.oldGoldPurchase.findFirst({
      where: this.tenantWhere(tenantId, { id: purchaseId }) as { tenantId: string; id: string },
    });

    if (!purchase) throw new NotFoundException('Old gold purchase not found');

    const { totalValuePaise, finalAmountPaise } = this.calculateValue(
      netWeightMg,
      Number(purchase.ratePaisePer10g),
      purityFineness,
      purchase.deductions as Array<{ amountPaise: number }> | undefined,
    );

    await this.prisma.oldGoldPurchase.update({
      where: { id: purchaseId },
      data: {
        purityFineness,
        netWeightMg: BigInt(netWeightMg),
        totalValuePaise: BigInt(totalValuePaise),
        finalAmountPaise: BigInt(finalAmountPaise),
        status: 'TESTED',
        updatedBy: userId,
      },
    });

    return this.getPurchase(tenantId, purchaseId);
  }

  async linkToSale(
    tenantId: string,
    userId: string,
    purchaseId: string,
    saleId: string,
  ): Promise<OldGoldPurchaseResponse> {
    const purchase = await this.prisma.oldGoldPurchase.findFirst({
      where: this.tenantWhere(tenantId, { id: purchaseId }) as { tenantId: string; id: string },
    });

    if (!purchase) throw new NotFoundException('Old gold purchase not found');

    await this.prisma.oldGoldPurchase.update({
      where: { id: purchaseId },
      data: {
        usedAgainstSaleId: saleId,
        status: 'EXCHANGED',
        updatedBy: userId,
      },
    });

    return this.getPurchase(tenantId, purchaseId);
  }

  async getPurchase(tenantId: string, purchaseId: string): Promise<OldGoldPurchaseResponse> {
    const purchase = await this.prisma.oldGoldPurchase.findFirst({
      where: this.tenantWhere(tenantId, { id: purchaseId }) as { tenantId: string; id: string },
    });

    if (!purchase) throw new NotFoundException('Old gold purchase not found');

    return {
      id: purchase.id,
      tenantId: purchase.tenantId,
      purchaseNumber: purchase.purchaseNumber,
      customerId: purchase.customerId,
      locationId: purchase.locationId,
      metalType: purchase.metalType,
      grossWeightMg: Number(purchase.grossWeightMg),
      netWeightMg: Number(purchase.netWeightMg),
      purityFineness: purchase.purityFineness,
      ratePaisePer10g: Number(purchase.ratePaisePer10g),
      totalValuePaise: Number(purchase.totalValuePaise),
      deductions: purchase.deductions as OldGoldPurchaseResponse['deductions'],
      finalAmountPaise: Number(purchase.finalAmountPaise),
      paymentMethod: purchase.paymentMethod,
      status: purchase.status as OldGoldPurchaseStatus,
      usedAgainstSaleId: purchase.usedAgainstSaleId,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    };
  }

  async listPurchases(
    tenantId: string,
    filters: { status?: string; customerId?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<OldGoldPurchaseResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;

    const [items, total] = await Promise.all([
      this.prisma.oldGoldPurchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.oldGoldPurchase.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        purchaseNumber: p.purchaseNumber,
        customerId: p.customerId,
        locationId: p.locationId,
        metalType: p.metalType,
        grossWeightMg: Number(p.grossWeightMg),
        netWeightMg: Number(p.netWeightMg),
        purityFineness: p.purityFineness,
        ratePaisePer10g: Number(p.ratePaisePer10g),
        totalValuePaise: Number(p.totalValuePaise),
        deductions: p.deductions as OldGoldPurchaseResponse['deductions'],
        finalAmountPaise: Number(p.finalAmountPaise),
        paymentMethod: p.paymentMethod,
        status: p.status as OldGoldPurchaseStatus,
        usedAgainstSaleId: p.usedAgainstSaleId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
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
