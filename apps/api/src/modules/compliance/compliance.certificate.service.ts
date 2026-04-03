// ─── Gemstone Certificate Service ─────────────────────────────
// CRUD and verification for gemstone certificates (GIA, IGI, etc.)

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  GemstoneCertificateInput,
  GemstoneCertificateListInput,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ComplianceCertificateService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(tenantId: string, userId: string, input: GemstoneCertificateInput) {
    // Check uniqueness of certificate number within tenant
    const existing = await this.prisma.gemstoneCertificate.findFirst({
      where: this.tenantWhere(tenantId, { certificateNumber: input.certificateNumber }),
    });
    if (existing) {
      throw new BadRequestException(
        `Certificate ${input.certificateNumber} already exists.`,
      );
    }

    const certificate = await this.prisma.gemstoneCertificate.create({
      data: {
        id: uuid(),
        tenantId,
        productId: input.productId,
        certificateNumber: input.certificateNumber,
        issuingLab: input.issuingLab,
        stoneType: input.stoneType,
        caratWeight: input.caratWeight,
        color: input.color ?? null,
        clarity: input.clarity ?? null,
        cut: input.cut ?? null,
        shape: input.shape ?? null,
        dimensions: input.dimensions ?? null,
        fluorescence: input.fluorescence ?? null,
        certificateDate: input.certificateDate ?? null,
        certificateUrl: input.certificateUrl ?? null,
        imageUrl: input.imageUrl ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { product: { select: { id: true, sku: true, name: true } } },
    });

    return certificate;
  }

  async update(tenantId: string, userId: string, id: string, input: Partial<GemstoneCertificateInput>) {
    const cert = await this.prisma.gemstoneCertificate.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!cert) throw new NotFoundException('Certificate not found.');

    return this.prisma.gemstoneCertificate.update({
      where: { id },
      data: {
        ...input,
        updatedBy: userId,
      },
      include: { product: { select: { id: true, sku: true, name: true } } },
    });
  }

  async findById(tenantId: string, id: string) {
    const cert = await this.prisma.gemstoneCertificate.findFirst({
      where: this.tenantWhere(tenantId, { id }),
      include: { product: { select: { id: true, sku: true, name: true } } },
    });
    if (!cert) throw new NotFoundException('Certificate not found.');
    return cert;
  }

  async findByCertificateNumber(tenantId: string, certificateNumber: string) {
    const cert = await this.prisma.gemstoneCertificate.findFirst({
      where: this.tenantWhere(tenantId, { certificateNumber }),
      include: { product: { select: { id: true, sku: true, name: true } } },
    });
    return cert;
  }

  async list(tenantId: string, input: GemstoneCertificateListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, issuingLab, isVerified, search } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (issuingLab) where.issuingLab = issuingLab;
    if (isVerified !== undefined) where.isVerified = isVerified;
    if (search) {
      where.OR = [
        { certificateNumber: { contains: search } },
        { product: { name: { contains: search } } },
        { stoneType: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.gemstoneCertificate.findMany({
        where,
        include: { product: { select: { id: true, sku: true, name: true } } },
        orderBy: { [sortBy ?? 'createdAt']: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.gemstoneCertificate.count({ where }),
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

  /**
   * Verify a certificate -- placeholder for lab API integration.
   * In production, this would call the GIA/IGI API.
   */
  async verifyCertificate(tenantId: string, userId: string, id: string) {
    const cert = await this.prisma.gemstoneCertificate.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!cert) throw new NotFoundException('Certificate not found.');

    // Mark as verified (in production, would validate against lab API)
    const updated = await this.prisma.gemstoneCertificate.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        updatedBy: userId,
      },
      include: { product: { select: { id: true, sku: true, name: true } } },
    });

    return {
      certificateNumber: updated.certificateNumber,
      isValid: true,
      lab: updated.issuingLab,
      verifiedAt: updated.verifiedAt,
    };
  }

  async getCertifiedStonesPercent(tenantId: string): Promise<number> {
    const [totalStones, certifiedStones] = await Promise.all([
      this.prisma.product.count({
        where: {
          tenantId,
          productType: { in: ['DIAMOND', 'GEMSTONE'] },
          isActive: true,
        },
      }),
      this.prisma.gemstoneCertificate.count({
        where: { tenantId, isVerified: true },
      }),
    ]);

    return totalStones > 0
      ? Math.round((certifiedStones / totalStones) * 10000) / 100
      : 100;
  }
}
