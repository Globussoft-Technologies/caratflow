// ─── Chain of Custody / Traceability Service ──────────────────
// Record ownership/location changes and generate traceability reports.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type { ChainOfCustodyInput } from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ComplianceTraceabilityService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async recordEvent(tenantId: string, userId: string, input: ChainOfCustodyInput) {
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: input.productId }),
    });
    if (!product) throw new NotFoundException('Product not found.');

    return this.prisma.chainOfCustody.create({
      data: {
        id: uuid(),
        tenantId,
        productId: input.productId,
        eventType: input.eventType,
        fromEntityType: input.fromEntityType ?? null,
        fromEntityId: input.fromEntityId ?? null,
        toEntityType: input.toEntityType ?? null,
        toEntityId: input.toEntityId ?? null,
        eventDate: input.eventDate ?? new Date(),
        locationId: input.locationId ?? null,
        documentReference: input.documentReference ?? null,
        notes: input.notes ?? null,
        metadata: input.metadata ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async getChainForProduct(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: productId }),
      select: { id: true, sku: true, name: true },
    });
    if (!product) throw new NotFoundException('Product not found.');

    const [events, huidRecord, certificates] = await Promise.all([
      this.prisma.chainOfCustody.findMany({
        where: this.tenantWhere(tenantId, { productId }),
        orderBy: { eventDate: 'asc' },
      }),
      this.prisma.huidRecord.findFirst({
        where: this.tenantWhere(tenantId, { productId, status: 'ACTIVE' }),
      }),
      this.prisma.gemstoneCertificate.findMany({
        where: this.tenantWhere(tenantId, { productId }),
      }),
    ]);

    return {
      productId,
      product,
      events,
      huidRecord: huidRecord ? {
        ...huidRecord,
        weightMg: Number(huidRecord.weightMg),
      } : null,
      certificates,
    };
  }

  async searchByProduct(tenantId: string, search: string) {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        OR: [
          { sku: { contains: search } },
          { name: { contains: search } },
          { huidNumber: { contains: search } },
        ],
      },
      select: { id: true, sku: true, name: true, huidNumber: true },
      take: 20,
    });
    return products;
  }
}
