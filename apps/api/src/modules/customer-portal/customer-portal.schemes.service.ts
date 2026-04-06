// ─── Customer Portal Schemes Service ──────────────────────────
// Self-service scheme management: view memberships, installment
// details, pay installments, enroll in new schemes.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type { Prisma } from '@caratflow/db';
import type {
  SchemeDashboardResponse,
  SchemeMembershipSummary,
  SchemeDetailResponse,
  SchemeInstallmentResponse,
  EnrollSchemeInput,
} from '@caratflow/shared-types';

@Injectable()
export class CustomerPortalSchemesService extends TenantAwareService {
  private readonly logger = new Logger(CustomerPortalSchemesService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── My Schemes Dashboard ───────────────────────────────────────

  async getMySchemes(
    tenantId: string,
    customerId: string,
  ): Promise<SchemeDashboardResponse> {
    // Fetch kitty memberships
    const kittyMemberships = await this.prisma.kittyMember.findMany({
      where: { tenantId, customerId, status: 'ACTIVE' },
      include: {
        kittyScheme: true,
        installments: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });

    // Fetch gold savings memberships
    const goldSavingsMemberships = await this.prisma.goldSavingsMember.findMany({
      where: { tenantId, customerId, status: 'ACTIVE' },
      include: {
        goldSavingsScheme: true,
        installments: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });

    let totalInvestedPaise = BigInt(0);
    const activeSchemes: SchemeMembershipSummary[] = [];
    const upcomingInstallments: SchemeDashboardResponse['upcomingInstallments'] = [];

    // Map kitty memberships
    for (const km of kittyMemberships) {
      totalInvestedPaise += km.totalPaidPaise;
      const totalInstallments = km.kittyScheme.durationMonths;
      const nextInstallment = km.installments[0] ?? null;

      activeSchemes.push({
        id: km.id,
        memberNumber: km.memberNumber,
        schemeType: 'KITTY',
        schemeName: km.kittyScheme.schemeName,
        status: km.status,
        totalPaidPaise: Number(km.totalPaidPaise),
        monthlyAmountPaise: Number(km.kittyScheme.monthlyAmountPaise),
        durationMonths: totalInstallments,
        paidInstallments: km.paidInstallments,
        totalInstallments,
        nextDueDate: nextInstallment?.dueDate ?? null,
        maturityDate: km.kittyScheme.endDate,
      });

      if (nextInstallment) {
        upcomingInstallments.push({
          membershipId: km.id,
          schemeName: km.kittyScheme.schemeName,
          installmentNumber: nextInstallment.installmentNumber,
          dueDate: nextInstallment.dueDate,
          amountPaise: Number(nextInstallment.amountPaise),
        });
      }
    }

    // Map gold savings memberships
    for (const gs of goldSavingsMemberships) {
      totalInvestedPaise += gs.totalPaidPaise;
      const totalPaidMonths = gs.goldSavingsScheme.durationMonths - gs.goldSavingsScheme.bonusMonths;
      const nextInstallment = gs.installments[0] ?? null;

      // Count paid installments
      const paidCount = await this.prisma.goldSavingsInstallment.count({
        where: { goldSavingsMemberId: gs.id, status: 'PAID' },
      });

      activeSchemes.push({
        id: gs.id,
        memberNumber: gs.memberNumber,
        schemeType: 'GOLD_SAVINGS',
        schemeName: gs.goldSavingsScheme.schemeName,
        status: gs.status,
        totalPaidPaise: Number(gs.totalPaidPaise),
        monthlyAmountPaise: Number(gs.goldSavingsScheme.monthlyAmountPaise),
        durationMonths: gs.goldSavingsScheme.durationMonths,
        paidInstallments: paidCount,
        totalInstallments: totalPaidMonths,
        nextDueDate: nextInstallment?.dueDate ?? null,
        maturityDate: gs.maturityDate,
      });

      if (nextInstallment) {
        upcomingInstallments.push({
          membershipId: gs.id,
          schemeName: gs.goldSavingsScheme.schemeName,
          installmentNumber: nextInstallment.installmentNumber,
          dueDate: nextInstallment.dueDate,
          amountPaise: Number(nextInstallment.amountPaise),
        });
      }
    }

    // Sort upcoming installments by due date
    upcomingInstallments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return {
      activeSchemes,
      totalInvestedPaise: Number(totalInvestedPaise),
      upcomingInstallments,
    };
  }

  // ─── Scheme Detail ──────────────────────────────────────────────

  async getSchemeDetail(
    tenantId: string,
    customerId: string,
    membershipId: string,
  ): Promise<SchemeDetailResponse> {
    // Try kitty first
    const kittyMember = await this.prisma.kittyMember.findFirst({
      where: { id: membershipId, tenantId, customerId },
      include: {
        kittyScheme: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    if (kittyMember) {
      return {
        id: kittyMember.id,
        memberNumber: kittyMember.memberNumber,
        schemeType: 'KITTY',
        schemeName: kittyMember.kittyScheme.schemeName,
        schemeDescription: kittyMember.kittyScheme.terms,
        status: kittyMember.status,
        joinedDate: kittyMember.joinedDate,
        monthlyAmountPaise: Number(kittyMember.kittyScheme.monthlyAmountPaise),
        durationMonths: kittyMember.kittyScheme.durationMonths,
        bonusPercent: kittyMember.kittyScheme.bonusPercent,
        bonusMonths: null,
        totalPaidPaise: Number(kittyMember.totalPaidPaise),
        maturityDate: kittyMember.kittyScheme.endDate,
        maturityValuePaise: Number(kittyMember.kittyScheme.totalValuePaise),
        installments: kittyMember.installments.map((inst) =>
          this.mapKittyInstallment(inst),
        ),
      };
    }

    // Try gold savings
    const gsMember = await this.prisma.goldSavingsMember.findFirst({
      where: { id: membershipId, tenantId, customerId },
      include: {
        goldSavingsScheme: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    if (gsMember) {
      return {
        id: gsMember.id,
        memberNumber: gsMember.memberNumber,
        schemeType: 'GOLD_SAVINGS',
        schemeName: gsMember.goldSavingsScheme.schemeName,
        schemeDescription: gsMember.goldSavingsScheme.terms,
        status: gsMember.status,
        joinedDate: gsMember.joinedDate,
        monthlyAmountPaise: Number(gsMember.goldSavingsScheme.monthlyAmountPaise),
        durationMonths: gsMember.goldSavingsScheme.durationMonths,
        bonusPercent: gsMember.goldSavingsScheme.maturityBonusPercent,
        bonusMonths: gsMember.goldSavingsScheme.bonusMonths,
        totalPaidPaise: Number(gsMember.totalPaidPaise),
        maturityDate: gsMember.maturityDate,
        maturityValuePaise: Number(gsMember.maturityValuePaise),
        installments: gsMember.installments.map((inst) =>
          this.mapGoldSavingsInstallment(inst),
        ),
      };
    }

    throw new NotFoundException('Scheme membership not found');
  }

  // ─── Pay Installment ────────────────────────────────────────────

  async payInstallment(
    tenantId: string,
    customerId: string,
    membershipId: string,
    paymentMethod: string,
  ): Promise<SchemeInstallmentResponse> {
    // Determine if this is a kitty or gold savings membership
    const kittyMember = await this.prisma.kittyMember.findFirst({
      where: { id: membershipId, tenantId, customerId, status: 'ACTIVE' },
    });

    if (kittyMember) {
      return this.payKittyInstallment(tenantId, customerId, kittyMember.id, paymentMethod);
    }

    const gsMember = await this.prisma.goldSavingsMember.findFirst({
      where: { id: membershipId, tenantId, customerId, status: 'ACTIVE' },
    });

    if (gsMember) {
      return this.payGoldSavingsInstallment(tenantId, customerId, gsMember.id, paymentMethod);
    }

    throw new NotFoundException('Active scheme membership not found');
  }

  private async payKittyInstallment(
    tenantId: string,
    customerId: string,
    memberId: string,
    paymentMethod: string,
  ): Promise<SchemeInstallmentResponse> {
    const nextInstallment = await this.prisma.kittyInstallment.findFirst({
      where: {
        tenantId,
        kittyMemberId: memberId,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      orderBy: { installmentNumber: 'asc' },
    });
    if (!nextInstallment) {
      throw new BadRequestException('No pending installments found');
    }

    const now = new Date();
    const paidMethod = this.toGirviPaymentMethod(paymentMethod);

    const updated = await this.prisma.$transaction(async (tx) => {
      const inst = await tx.kittyInstallment.update({
        where: { id: nextInstallment.id },
        data: {
          paidDate: now,
          method: paidMethod,
          status: 'PAID',
          updatedBy: customerId,
        },
      });

      await tx.kittyMember.update({
        where: { id: memberId },
        data: {
          paidInstallments: { increment: 1 },
          totalPaidPaise: { increment: nextInstallment.amountPaise },
        },
      });

      return inst;
    });

    this.logger.log(
      `Customer ${customerId} paid kitty installment #${updated.installmentNumber} for membership ${memberId}`,
    );

    return this.mapKittyInstallment(updated);
  }

  private async payGoldSavingsInstallment(
    tenantId: string,
    customerId: string,
    memberId: string,
    paymentMethod: string,
  ): Promise<SchemeInstallmentResponse> {
    const nextInstallment = await this.prisma.goldSavingsInstallment.findFirst({
      where: {
        tenantId,
        goldSavingsMemberId: memberId,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      orderBy: { installmentNumber: 'asc' },
    });
    if (!nextInstallment) {
      throw new BadRequestException('No pending installments found');
    }

    const now = new Date();
    const paidMethod = this.toGirviPaymentMethod(paymentMethod);

    const updated = await this.prisma.$transaction(async (tx) => {
      const inst = await tx.goldSavingsInstallment.update({
        where: { id: nextInstallment.id },
        data: {
          paidDate: now,
          method: paidMethod,
          status: 'PAID',
          updatedBy: customerId,
        },
      });

      await tx.goldSavingsMember.update({
        where: { id: memberId },
        data: {
          totalPaidPaise: { increment: nextInstallment.amountPaise },
        },
      });

      return inst;
    });

    this.logger.log(
      `Customer ${customerId} paid gold savings installment #${updated.installmentNumber} for membership ${memberId}`,
    );

    return this.mapGoldSavingsInstallment(updated);
  }

  // ─── Scheme Statement ───────────────────────────────────────────

  async getSchemeStatement(
    tenantId: string,
    customerId: string,
    membershipId: string,
  ): Promise<{ statementUrl: string }> {
    // Verify membership ownership
    const detail = await this.getSchemeDetail(tenantId, customerId, membershipId);

    // In production, this would generate a PDF statement and upload to S3
    const statementUrl = `/api/v1/store/account/schemes/${membershipId}/statement/pdf`;

    this.logger.log(
      `Statement requested for ${detail.schemeType} membership ${membershipId} by customer ${customerId}`,
    );

    return { statementUrl };
  }

  // ─── Enroll in Scheme ───────────────────────────────────────────

  async enrollInScheme(
    tenantId: string,
    customerId: string,
    input: EnrollSchemeInput,
  ): Promise<SchemeMembershipSummary> {
    const now = new Date();

    if (input.schemeType === 'KITTY') {
      return this.enrollInKittyScheme(tenantId, customerId, input.schemeId, now);
    }

    return this.enrollInGoldSavingsScheme(tenantId, customerId, input.schemeId, now);
  }

  private async enrollInKittyScheme(
    tenantId: string,
    customerId: string,
    schemeId: string,
    joinedDate: Date,
  ): Promise<SchemeMembershipSummary> {
    const scheme = await this.prisma.kittyScheme.findFirst({
      where: { id: schemeId, tenantId, status: { in: ['OPEN', 'ACTIVE'] } },
    });
    if (!scheme) throw new NotFoundException('Kitty scheme not found or not accepting members');

    if (scheme.currentMembers >= scheme.maxMembers) {
      throw new BadRequestException('Scheme has reached maximum members');
    }

    // Check for existing enrollment
    const existing = await this.prisma.kittyMember.findFirst({
      where: { tenantId, kittySchemeId: schemeId, customerId },
    });
    if (existing) {
      throw new BadRequestException('You are already enrolled in this scheme');
    }

    const memberNumber = `${scheme.schemeName.slice(0, 3).toUpperCase()}-${String(scheme.currentMembers + 1).padStart(4, '0')}`;

    const member = await this.prisma.$transaction(async (tx) => {
      const newMember = await tx.kittyMember.create({
        data: {
          tenantId,
          kittySchemeId: schemeId,
          customerId,
          memberNumber,
          joinedDate,
          status: 'ACTIVE',
          createdBy: customerId,
          updatedBy: customerId,
        },
      });

      // Generate installments
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

      await tx.kittyScheme.update({
        where: { id: schemeId },
        data: {
          currentMembers: { increment: 1 },
          status: scheme.currentMembers + 1 >= scheme.maxMembers ? 'ACTIVE' : scheme.status,
        },
      });

      return newMember;
    });

    // Get first pending installment date
    const firstInstallment = await this.prisma.kittyInstallment.findFirst({
      where: { kittyMemberId: member.id, status: 'PENDING' },
      orderBy: { dueDate: 'asc' },
    });

    return {
      id: member.id,
      memberNumber: member.memberNumber,
      schemeType: 'KITTY',
      schemeName: scheme.schemeName,
      status: member.status,
      totalPaidPaise: 0,
      monthlyAmountPaise: Number(scheme.monthlyAmountPaise),
      durationMonths: scheme.durationMonths,
      paidInstallments: 0,
      totalInstallments: scheme.durationMonths,
      nextDueDate: firstInstallment?.dueDate ?? null,
      maturityDate: scheme.endDate,
    };
  }

  private async enrollInGoldSavingsScheme(
    tenantId: string,
    customerId: string,
    schemeId: string,
    joinedDate: Date,
  ): Promise<SchemeMembershipSummary> {
    const scheme = await this.prisma.goldSavingsScheme.findFirst({
      where: { id: schemeId, tenantId, status: { in: ['OPEN', 'ACTIVE'] } },
    });
    if (!scheme) throw new NotFoundException('Gold savings scheme not found or not accepting members');

    const existing = await this.prisma.goldSavingsMember.findFirst({
      where: { tenantId, goldSavingsSchemeId: schemeId, customerId },
    });
    if (existing) {
      throw new BadRequestException('You are already enrolled in this scheme');
    }

    const memberCount = await this.prisma.goldSavingsMember.count({
      where: { goldSavingsSchemeId: schemeId },
    });
    const memberNumber = `GS-${String(memberCount + 1).padStart(4, '0')}`;

    const maturityDate = new Date(joinedDate);
    maturityDate.setMonth(maturityDate.getMonth() + scheme.durationMonths);

    const totalPaidMonths = scheme.durationMonths - scheme.bonusMonths;
    const basePaid = scheme.monthlyAmountPaise * BigInt(totalPaidMonths);
    const bonusValue = scheme.monthlyAmountPaise * BigInt(scheme.bonusMonths);
    const maturityBonus = (basePaid * BigInt(scheme.maturityBonusPercent)) / BigInt(10000);
    const maturityValuePaise = basePaid + bonusValue + maturityBonus;

    const member = await this.prisma.$transaction(async (tx) => {
      const newMember = await tx.goldSavingsMember.create({
        data: {
          tenantId,
          goldSavingsSchemeId: schemeId,
          customerId,
          memberNumber,
          joinedDate,
          status: 'ACTIVE',
          maturityDate,
          maturityValuePaise,
          createdBy: customerId,
          updatedBy: customerId,
        },
      });

      const installments: Prisma.GoldSavingsInstallmentCreateManyInput[] = [];
      for (let i = 1; i <= totalPaidMonths; i++) {
        const dueDate = new Date(joinedDate);
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

    const firstInstallment = await this.prisma.goldSavingsInstallment.findFirst({
      where: { goldSavingsMemberId: member.id, status: 'PENDING' },
      orderBy: { dueDate: 'asc' },
    });

    return {
      id: member.id,
      memberNumber: member.memberNumber,
      schemeType: 'GOLD_SAVINGS',
      schemeName: scheme.schemeName,
      status: member.status,
      totalPaidPaise: 0,
      monthlyAmountPaise: Number(scheme.monthlyAmountPaise),
      durationMonths: scheme.durationMonths,
      paidInstallments: 0,
      totalInstallments: totalPaidMonths,
      nextDueDate: firstInstallment?.dueDate ?? null,
      maturityDate,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private mapKittyInstallment(inst: {
    id: string;
    installmentNumber: number;
    dueDate: Date;
    paidDate: Date | null;
    amountPaise: bigint;
    lateFeePaise: bigint;
    status: string;
  }): SchemeInstallmentResponse {
    return {
      id: inst.id,
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate,
      paidDate: inst.paidDate,
      amountPaise: Number(inst.amountPaise),
      lateFeePaise: Number(inst.lateFeePaise),
      status: inst.status,
    };
  }

  private mapGoldSavingsInstallment(inst: {
    id: string;
    installmentNumber: number;
    dueDate: Date;
    paidDate: Date | null;
    amountPaise: bigint;
    status: string;
  }): SchemeInstallmentResponse {
    return {
      id: inst.id,
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate,
      paidDate: inst.paidDate,
      amountPaise: Number(inst.amountPaise),
      lateFeePaise: null,
      status: inst.status,
    };
  }

  private toGirviPaymentMethod(method: string): 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' {
    switch (method.toUpperCase()) {
      case 'UPI':
        return 'UPI';
      case 'BANK_TRANSFER':
      case 'CARD':
        return 'BANK_TRANSFER';
      case 'CHEQUE':
        return 'CHEQUE';
      default:
        return 'BANK_TRANSFER';
    }
  }
}
