// ─── India Scheme Service ──────────────────────────────────────
// Kitty/Chit fund schemes and Gold Savings schemes.
// CRUD, member enrollment, installment tracking, maturity handling.

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { parsePagination, buildPaginatedResult } from '../../common/pagination.helper';
import type { Prisma } from '@caratflow/db';
import type {
  KittySchemeInput,
  KittySchemeListInput,
  KittyMemberInput,
  KittyInstallmentInput,
  GoldSavingsSchemeInput,
  GoldSavingsSchemeListInput,
  GoldSavingsMemberInput,
  GoldSavingsInstallmentInput,
} from '@caratflow/shared-types';

@Injectable()
export class IndiaSchemeService extends TenantAwareService {
  private readonly logger = new Logger(IndiaSchemeService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ═══════════════════════════════════════════════════════════════
  //  KITTY / CHIT SCHEMES
  // ═══════════════════════════════════════════════════════════════

  async createKittyScheme(tenantId: string, userId: string, input: KittySchemeInput) {
    const totalValuePaise = BigInt(input.monthlyAmountPaise) * BigInt(input.durationMonths);
    const endDate = new Date(input.startDate);
    endDate.setMonth(endDate.getMonth() + input.durationMonths);

    return this.prisma.kittyScheme.create({
      data: {
        tenantId,
        schemeName: input.schemeName,
        schemeType: input.schemeType,
        monthlyAmountPaise: BigInt(input.monthlyAmountPaise),
        durationMonths: input.durationMonths,
        totalValuePaise,
        bonusPercent: input.bonusPercent ?? null,
        startDate: input.startDate,
        endDate,
        status: 'OPEN',
        maxMembers: input.maxMembers,
        currentMembers: 0,
        terms: input.terms ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async getKittyScheme(tenantId: string, id: string) {
    const scheme = await this.prisma.kittyScheme.findFirst({
      where: this.tenantWhere(tenantId, { id }) as Prisma.KittySchemeWhereInput,
      include: {
        members: {
          include: {
            customer: true,
            installments: { orderBy: { installmentNumber: 'asc' } },
          },
        },
      },
    });
    if (!scheme) throw new NotFoundException('Kitty scheme not found');
    return scheme;
  }

  async listKittySchemes(tenantId: string, input: KittySchemeListInput) {
    const { skip, take, orderBy, page, limit } = parsePagination(input);

    const where: Prisma.KittySchemeWhereInput = { tenantId };
    if (input.status) where.status = input.status;
    if (input.search) {
      where.schemeName = { contains: input.search };
    }

    const [items, total] = await Promise.all([
      this.prisma.kittyScheme.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        include: { _count: { select: { members: true } } },
      }),
      this.prisma.kittyScheme.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async enrollKittyMember(tenantId: string, userId: string, input: KittyMemberInput) {
    const scheme = await this.prisma.kittyScheme.findFirst({
      where: this.tenantWhere(tenantId, {
        id: input.kittySchemeId,
        status: { in: ['OPEN', 'ACTIVE'] },
      }) as Prisma.KittySchemeWhereInput,
    });
    if (!scheme) throw new NotFoundException('Kitty scheme not found or not accepting members');

    if (scheme.currentMembers >= scheme.maxMembers) {
      throw new BadRequestException('Scheme has reached maximum members');
    }

    // Check if customer is already enrolled
    const existingMember = await this.prisma.kittyMember.findFirst({
      where: { tenantId, kittySchemeId: input.kittySchemeId, customerId: input.customerId },
    });
    if (existingMember) {
      throw new BadRequestException('Customer is already enrolled in this scheme');
    }

    const memberNumber = `${scheme.schemeName.slice(0, 3).toUpperCase()}-${String(scheme.currentMembers + 1).padStart(4, '0')}`;

    const member = await this.prisma.$transaction(async (tx) => {
      const newMember = await tx.kittyMember.create({
        data: {
          tenantId,
          kittySchemeId: input.kittySchemeId,
          customerId: input.customerId,
          memberNumber,
          joinedDate: input.joinedDate,
          status: 'ACTIVE',
          createdBy: userId,
          updatedBy: userId,
        },
        include: { customer: true },
      });

      // Generate installment schedule
      const installments: Prisma.KittyInstallmentCreateManyInput[] = [];
      for (let i = 1; i <= scheme.durationMonths; i++) {
        const dueDate = new Date(scheme.startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        installments.push({
          tenantId,
          kittyMemberId: newMember.id,
          installmentNumber: i,
          dueDate,
          amountPaise: scheme.monthlyAmountPaise,
          status: 'PENDING',
        });
      }
      await tx.kittyInstallment.createMany({ data: installments });

      // Update member count
      await tx.kittyScheme.update({
        where: { id: input.kittySchemeId },
        data: {
          currentMembers: { increment: 1 },
          status: scheme.currentMembers + 1 >= scheme.maxMembers ? 'ACTIVE' : scheme.status,
        },
      });

      return newMember;
    });

    return member;
  }

  async recordKittyInstallment(tenantId: string, userId: string, input: KittyInstallmentInput) {
    const installment = await this.prisma.kittyInstallment.findFirst({
      where: {
        tenantId,
        kittyMemberId: input.kittyMemberId,
        installmentNumber: input.installmentNumber,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
    });
    if (!installment) throw new NotFoundException('Pending installment not found');

    const updatedInstallment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.kittyInstallment.update({
        where: { id: installment.id },
        data: {
          paidDate: input.paidDate,
          amountPaise: BigInt(input.amountPaise),
          lateFeePaise: BigInt(input.lateFeePaise ?? 0),
          method: input.method,
          reference: input.reference ?? null,
          status: 'PAID',
          updatedBy: userId,
        },
      });

      // Update member totals
      await tx.kittyMember.update({
        where: { id: input.kittyMemberId },
        data: {
          paidInstallments: { increment: 1 },
          totalPaidPaise: { increment: BigInt(input.amountPaise) },
        },
      });

      return updated;
    });

    return updatedInstallment;
  }

  async matureKittyScheme(tenantId: string, userId: string, schemeId: string) {
    const scheme = await this.prisma.kittyScheme.findFirst({
      where: this.tenantWhere(tenantId, { id: schemeId, status: 'ACTIVE' }) as Prisma.KittySchemeWhereInput,
    });
    if (!scheme) throw new NotFoundException('Active kitty scheme not found');

    // Mark all active members as completed
    await this.prisma.kittyMember.updateMany({
      where: { kittySchemeId: schemeId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    });

    return this.prisma.kittyScheme.update({
      where: { id: schemeId },
      data: { status: 'MATURED', updatedBy: userId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  GOLD SAVINGS SCHEMES
  // ═══════════════════════════════════════════════════════════════

  async createGoldSavingsScheme(tenantId: string, userId: string, input: GoldSavingsSchemeInput) {
    return this.prisma.goldSavingsScheme.create({
      data: {
        tenantId,
        schemeName: input.schemeName,
        monthlyAmountPaise: BigInt(input.monthlyAmountPaise),
        durationMonths: input.durationMonths,
        bonusMonths: input.bonusMonths,
        maturityBonusPercent: input.maturityBonusPercent,
        startDate: input.startDate,
        status: 'OPEN',
        terms: input.terms ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async getGoldSavingsScheme(tenantId: string, id: string) {
    const scheme = await this.prisma.goldSavingsScheme.findFirst({
      where: this.tenantWhere(tenantId, { id }) as Prisma.GoldSavingsSchemeWhereInput,
      include: {
        members: {
          include: {
            customer: true,
            installments: { orderBy: { installmentNumber: 'asc' } },
          },
        },
      },
    });
    if (!scheme) throw new NotFoundException('Gold savings scheme not found');
    return scheme;
  }

  async listGoldSavingsSchemes(tenantId: string, input: GoldSavingsSchemeListInput) {
    const { skip, take, orderBy, page, limit } = parsePagination(input);

    const where: Prisma.GoldSavingsSchemeWhereInput = { tenantId };
    if (input.status) where.status = input.status;
    if (input.search) {
      where.schemeName = { contains: input.search };
    }

    const [items, total] = await Promise.all([
      this.prisma.goldSavingsScheme.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        include: { _count: { select: { members: true } } },
      }),
      this.prisma.goldSavingsScheme.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async enrollGoldSavingsMember(tenantId: string, userId: string, input: GoldSavingsMemberInput) {
    const scheme = await this.prisma.goldSavingsScheme.findFirst({
      where: this.tenantWhere(tenantId, {
        id: input.goldSavingsSchemeId,
        status: { in: ['OPEN', 'ACTIVE'] },
      }) as Prisma.GoldSavingsSchemeWhereInput,
    });
    if (!scheme) throw new NotFoundException('Gold savings scheme not found or not accepting members');

    // Check for existing enrollment
    const existingMember = await this.prisma.goldSavingsMember.findFirst({
      where: { tenantId, goldSavingsSchemeId: input.goldSavingsSchemeId, customerId: input.customerId },
    });
    if (existingMember) {
      throw new BadRequestException('Customer is already enrolled in this scheme');
    }

    const memberCount = await this.prisma.goldSavingsMember.count({
      where: { goldSavingsSchemeId: input.goldSavingsSchemeId },
    });
    const memberNumber = `GS-${String(memberCount + 1).padStart(4, '0')}`;

    // Calculate maturity date and value
    const maturityDate = new Date(input.joinedDate);
    maturityDate.setMonth(maturityDate.getMonth() + scheme.durationMonths);

    // Pay durationMonths - bonusMonths, get full durationMonths value
    const totalPaidMonths = scheme.durationMonths - scheme.bonusMonths;
    const basePaid = BigInt(scheme.monthlyAmountPaise) * BigInt(totalPaidMonths);
    const bonusValue = BigInt(scheme.monthlyAmountPaise) * BigInt(scheme.bonusMonths);
    const maturityBonus = (basePaid * BigInt(scheme.maturityBonusPercent)) / BigInt(10000);
    const maturityValuePaise = basePaid + bonusValue + maturityBonus;

    const member = await this.prisma.$transaction(async (tx) => {
      const newMember = await tx.goldSavingsMember.create({
        data: {
          tenantId,
          goldSavingsSchemeId: input.goldSavingsSchemeId,
          customerId: input.customerId,
          memberNumber,
          joinedDate: input.joinedDate,
          status: 'ACTIVE',
          maturityDate,
          maturityValuePaise,
          createdBy: userId,
          updatedBy: userId,
        },
        include: { customer: true },
      });

      // Generate installment schedule (only for paid months, not bonus months)
      const installments: Prisma.GoldSavingsInstallmentCreateManyInput[] = [];
      for (let i = 1; i <= totalPaidMonths; i++) {
        const dueDate = new Date(input.joinedDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        installments.push({
          tenantId,
          goldSavingsMemberId: newMember.id,
          installmentNumber: i,
          dueDate,
          amountPaise: scheme.monthlyAmountPaise,
          status: 'PENDING',
        });
      }
      await tx.goldSavingsInstallment.createMany({ data: installments });

      return newMember;
    });

    return member;
  }

  async recordGoldSavingsInstallment(tenantId: string, userId: string, input: GoldSavingsInstallmentInput) {
    const installment = await this.prisma.goldSavingsInstallment.findFirst({
      where: {
        tenantId,
        goldSavingsMemberId: input.goldSavingsMemberId,
        installmentNumber: input.installmentNumber,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
    });
    if (!installment) throw new NotFoundException('Pending installment not found');

    const updatedInstallment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.goldSavingsInstallment.update({
        where: { id: installment.id },
        data: {
          paidDate: input.paidDate,
          amountPaise: BigInt(input.amountPaise),
          method: input.method,
          reference: input.reference ?? null,
          status: 'PAID',
          updatedBy: userId,
        },
      });

      // Update member totals
      await tx.goldSavingsMember.update({
        where: { id: input.goldSavingsMemberId },
        data: {
          totalPaidPaise: { increment: BigInt(input.amountPaise) },
        },
      });

      return updated;
    });

    return updatedInstallment;
  }

  /**
   * Calculate maturity value for a gold savings member.
   * Standard: pay 11 months, get 12th month free + bonus percent.
   */
  calculateMaturityValue(
    monthlyAmountPaise: number,
    durationMonths: number,
    bonusMonths: number,
    maturityBonusPercent: number,
  ): { totalPaidPaise: number; bonusValuePaise: number; maturityBonusPaise: number; maturityValuePaise: number } {
    const paidMonths = durationMonths - bonusMonths;
    const totalPaidPaise = monthlyAmountPaise * paidMonths;
    const bonusValuePaise = monthlyAmountPaise * bonusMonths;
    const maturityBonusPaise = Math.round((totalPaidPaise * maturityBonusPercent) / 10000);
    const maturityValuePaise = totalPaidPaise + bonusValuePaise + maturityBonusPaise;

    return { totalPaidPaise, bonusValuePaise, maturityBonusPaise, maturityValuePaise };
  }

  async redeemGoldSavings(tenantId: string, userId: string, memberId: string) {
    const member = await this.prisma.goldSavingsMember.findFirst({
      where: this.tenantWhere(tenantId, { id: memberId, status: 'MATURED' }) as Prisma.GoldSavingsMemberWhereInput,
    });
    if (!member) throw new NotFoundException('Matured gold savings member not found');

    return this.prisma.goldSavingsMember.update({
      where: { id: memberId },
      data: {
        status: 'REDEEMED',
        redemptionDate: new Date(),
        updatedBy: userId,
      },
      include: { customer: true, goldSavingsScheme: true },
    });
  }

  // ─── Overdue Tracking (BullMQ cron) ──────────────────────────

  async markOverdueInstallments(tenantId: string): Promise<number> {
    const now = new Date();

    const kittyOverdue = await this.prisma.kittyInstallment.updateMany({
      where: { tenantId, status: 'PENDING', dueDate: { lt: now } },
      data: { status: 'OVERDUE' },
    });

    const gsOverdue = await this.prisma.goldSavingsInstallment.updateMany({
      where: { tenantId, status: 'PENDING', dueDate: { lt: now } },
      data: { status: 'OVERDUE' },
    });

    const total = kittyOverdue.count + gsOverdue.count;
    if (total > 0) {
      this.logger.log(`Marked ${total} installments as overdue for tenant ${tenantId}`);
    }
    return total;
  }

  /**
   * Check for gold savings members reaching maturity.
   */
  async processMaturityDates(tenantId: string): Promise<number> {
    const now = new Date();

    const maturingMembers = await this.prisma.goldSavingsMember.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        maturityDate: { lte: now },
      },
    });

    let maturedCount = 0;
    for (const member of maturingMembers) {
      // Check all installments are paid
      const pendingCount = await this.prisma.goldSavingsInstallment.count({
        where: {
          goldSavingsMemberId: member.id,
          status: { in: ['PENDING', 'OVERDUE'] },
        },
      });

      if (pendingCount === 0) {
        await this.prisma.goldSavingsMember.update({
          where: { id: member.id },
          data: { status: 'MATURED' },
        });
        maturedCount++;
      }
    }

    if (maturedCount > 0) {
      this.logger.log(`${maturedCount} gold savings members matured for tenant ${tenantId}`);
    }
    return maturedCount;
  }
}
