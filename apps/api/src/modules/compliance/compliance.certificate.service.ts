// ─── Gemstone Certificate Service ─────────────────────────────
// CRUD and verification for gemstone certificates (GIA, IGI, etc.)

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(ComplianceCertificateService.name);

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
   * Verify a certificate against the issuing lab's public lookup
   * service.
   *
   * Real lab-API path activates when credentials are configured:
   *   GIA_API_URL + GIA_API_KEY for GIA
   *   IGI_API_URL + IGI_API_KEY for IGI
   * When no creds are set, we fall back to a deterministic 250 ms
   * mock-delay and mark the cert as verified (demo mode). When creds
   * are set, we call the lab endpoint and only mark VERIFIED if the
   * lab responds with a matching stone; otherwise we raise a
   * BadRequestException and leave the record unverified.
   */
  async verifyCertificate(tenantId: string, userId: string, id: string) {
    const cert = await this.prisma.gemstoneCertificate.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!cert) throw new NotFoundException('Certificate not found.');

    const lab = cert.issuingLab?.toUpperCase() ?? '';
    const labResult = await this.callLabApi(lab, cert.certificateNumber);

    if (labResult.mode === 'REAL' && !labResult.valid) {
      throw new BadRequestException(
        `Lab ${lab} could not verify certificate ${cert.certificateNumber}: ${labResult.reason ?? 'not found'}`,
      );
    }

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
      source: labResult.mode === 'REAL' ? `${lab}-API` : 'MOCK',
    };
  }

  /**
   * Call the lab's public cert-lookup endpoint when creds are set.
   * Falls back to a 250 ms mock delay (demo mode) when not set.
   */
  private async callLabApi(
    lab: string,
    certificateNumber: string,
  ): Promise<{ mode: 'REAL' | 'MOCK'; valid: boolean; reason?: string }> {
    const envBase = lab === 'GIA' ? process.env.GIA_API_URL : lab === 'IGI' ? process.env.IGI_API_URL : undefined;
    const envKey = lab === 'GIA' ? process.env.GIA_API_KEY : lab === 'IGI' ? process.env.IGI_API_KEY : undefined;

    if (!envBase || !envKey) {
      // Demo mode: mock with a small artificial delay so UI spinners render.
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
      this.logger.log(
        `[lab-mock] ${lab || 'UNKNOWN'} cert ${certificateNumber} accepted (set ${lab}_API_URL + ${lab}_API_KEY for real lookup)`,
      );
      return { mode: 'MOCK', valid: true };
    }

    try {
      const url = `${envBase.replace(/\/$/, '')}/verify/${encodeURIComponent(certificateNumber)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'x-api-key': envKey, Accept: 'application/json' },
      });
      if (!res.ok) {
        this.logger.warn(`[${lab}] lookup HTTP ${res.status} for ${certificateNumber}`);
        return { mode: 'REAL', valid: false, reason: `HTTP ${res.status}` };
      }
      const body = (await res.json()) as { valid?: boolean; status?: string; message?: string };
      const valid = body.valid === true || body.status === 'VALID';
      return { mode: 'REAL', valid, reason: valid ? undefined : (body.message ?? 'not found') };
    } catch (err) {
      this.logger.error(`[${lab}] lookup failed: ${(err as Error).message}`);
      return { mode: 'REAL', valid: false, reason: (err as Error).message };
    }
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
