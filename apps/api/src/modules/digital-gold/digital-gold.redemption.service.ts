// ─── Digital Gold Redemption Service ───────────────────────────
// Physical gold delivery, jewelry redemption, sell-back to cash.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { IndiaRatesService } from '../india/india.rates.service';
import type {
  RedeemGoldInput,
  RedeemGoldResponse,
  GoldRedemptionType,
  GoldRedemptionStatus,
} from '@caratflow/shared-types';

/** Minimum physical redemption: 0.5g = 500 mg */
const MIN_PHYSICAL_REDEMPTION_MG = 500;
/** Digital gold purity */
const DIGITAL_GOLD_PURITY = 999;
/** Sell spread per 10g in paise */
const SELL_SPREAD_PER_10G_PAISE = -5_000;

@Injectable()
export class DigitalGoldRedemptionService extends TenantAwareService {
  private readonly logger = new Logger(DigitalGoldRedemptionService.name);

  constructor(
    prisma: PrismaService,
    private readonly ratesService: IndiaRatesService,
  ) {
    super(prisma);
  }

  // ─── Redeem for Physical Gold ─────────────────────────────────

  async redeemForPhysical(
    tenantId: string,
    customerId: string,
    weightMg: number,
    addressId: string,
  ): Promise<RedeemGoldResponse> {
    if (weightMg < MIN_PHYSICAL_REDEMPTION_MG) {
      throw new BadRequestException(
        `Minimum physical redemption is ${MIN_PHYSICAL_REDEMPTION_MG} mg (${MIN_PHYSICAL_REDEMPTION_MG / 1000}g)`,
      );
    }

    const vault = await this.getActiveVault(tenantId, customerId);
    const balance = Number(vault.balanceMg);

    if (weightMg > balance) {
      throw new BadRequestException(
        `Insufficient gold balance. Available: ${balance} mg, requested: ${weightMg} mg`,
      );
    }

    const liveRate = await this.ratesService.getCurrentRate('GOLD', DIGITAL_GOLD_PURITY);
    const ratePerGramPaise = Math.round(liveRate.ratePer10gPaise / 10);
    const valuePaise = Math.round((weightMg * ratePerGramPaise) / 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct gold from vault
      const newBalance = balance - weightMg;
      await tx.goldVault.update({
        where: { id: vault.id },
        data: { balanceMg: BigInt(newBalance) },
      });

      // Create redemption record
      const redemption = await tx.goldRedemption.create({
        data: {
          tenantId,
          vaultId: vault.id,
          redemptionType: 'PHYSICAL_GOLD',
          goldWeightMg: BigInt(weightMg),
          valuePaise: BigInt(valuePaise),
          status: 'REQUESTED',
          deliveryAddressId: addressId,
        },
      });

      // Also record as a transaction
      await tx.goldTransaction.create({
        data: {
          tenantId,
          vaultId: vault.id,
          transactionType: 'REDEEM_PHYSICAL',
          amountPaise: BigInt(valuePaise),
          goldWeightMg: BigInt(weightMg),
          pricePerGramPaise: BigInt(ratePerGramPaise),
          pricePer10gPaise: BigInt(liveRate.ratePer10gPaise),
          status: 'COMPLETED',
          reference: `DG-REDEEM-PHYS-${Date.now()}`,
          processedAt: new Date(),
        },
      });

      return { redemption, newBalance };
    });

    this.logger.log(
      `Physical gold redemption: customer=${customerId}, weight=${weightMg}mg, value=${valuePaise}p`,
    );

    return {
      redemptionId: result.redemption.id,
      redemptionType: 'PHYSICAL_GOLD' as GoldRedemptionType,
      goldWeightMg: weightMg,
      valuePaise,
      status: 'REQUESTED' as GoldRedemptionStatus,
      newBalanceMg: result.newBalance,
    };
  }

  // ─── Redeem for Jewelry ───────────────────────────────────────

  async redeemForJewelry(
    tenantId: string,
    customerId: string,
    productId: string,
    addressId: string,
  ): Promise<RedeemGoldResponse> {
    const vault = await this.getActiveVault(tenantId, customerId);

    // Look up the product to get its gold weight
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: productId, isActive: true }) as Record<string, unknown>,
    });

    if (!product) {
      throw new NotFoundException('Product not found or not available');
    }

    if (!product.metalWeightMg) {
      throw new BadRequestException('Product does not have a metal weight defined');
    }

    const goldWeightMg = Number(product.metalWeightMg);
    const balance = Number(vault.balanceMg);

    if (goldWeightMg > balance) {
      throw new BadRequestException(
        `Insufficient gold balance for this jewelry. Required: ${goldWeightMg} mg, available: ${balance} mg. ` +
        'You may need to buy more gold or choose a lighter piece.',
      );
    }

    const liveRate = await this.ratesService.getCurrentRate('GOLD', DIGITAL_GOLD_PURITY);
    const ratePerGramPaise = Math.round(liveRate.ratePer10gPaise / 10);
    const goldValuePaise = Math.round((goldWeightMg * ratePerGramPaise) / 1000);

    // Customer pays making charges + stone value separately (not deducted from vault)
    // Only the gold weight is deducted from the digital gold balance
    const result = await this.prisma.$transaction(async (tx) => {
      const newBalance = balance - goldWeightMg;
      await tx.goldVault.update({
        where: { id: vault.id },
        data: { balanceMg: BigInt(newBalance) },
      });

      const redemption = await tx.goldRedemption.create({
        data: {
          tenantId,
          vaultId: vault.id,
          redemptionType: 'JEWELRY',
          goldWeightMg: BigInt(goldWeightMg),
          valuePaise: BigInt(goldValuePaise),
          status: 'REQUESTED',
          productId,
          deliveryAddressId: addressId,
        },
      });

      await tx.goldTransaction.create({
        data: {
          tenantId,
          vaultId: vault.id,
          transactionType: 'REDEEM_JEWELRY',
          amountPaise: BigInt(goldValuePaise),
          goldWeightMg: BigInt(goldWeightMg),
          pricePerGramPaise: BigInt(ratePerGramPaise),
          pricePer10gPaise: BigInt(liveRate.ratePer10gPaise),
          status: 'COMPLETED',
          reference: `DG-REDEEM-JWL-${Date.now()}`,
          processedAt: new Date(),
        },
      });

      return { redemption, newBalance };
    });

    this.logger.log(
      `Jewelry redemption: customer=${customerId}, product=${productId}, weight=${goldWeightMg}mg`,
    );

    return {
      redemptionId: result.redemption.id,
      redemptionType: 'JEWELRY' as GoldRedemptionType,
      goldWeightMg,
      valuePaise: goldValuePaise,
      status: 'REQUESTED' as GoldRedemptionStatus,
      newBalanceMg: result.newBalance,
    };
  }

  // ─── Sell Back (cash out) ─────────────────────────────────────

  async sellBack(
    tenantId: string,
    customerId: string,
    weightMg: number,
    addressId: string,
  ): Promise<RedeemGoldResponse> {
    const vault = await this.getActiveVault(tenantId, customerId);
    const balance = Number(vault.balanceMg);

    if (weightMg > balance) {
      throw new BadRequestException(
        `Insufficient gold balance. Available: ${balance} mg, requested: ${weightMg} mg`,
      );
    }

    const liveRate = await this.ratesService.getCurrentRate('GOLD', DIGITAL_GOLD_PURITY);
    const sellPricePer10gPaise = liveRate.ratePer10gPaise + SELL_SPREAD_PER_10G_PAISE;
    const sellPricePerGramPaise = Math.round(sellPricePer10gPaise / 10);
    const amountPaise = Math.floor((weightMg * sellPricePerGramPaise) / 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      const newBalance = balance - weightMg;
      const newTotalSold = Number(vault.totalSoldPaise) + amountPaise;

      await tx.goldVault.update({
        where: { id: vault.id },
        data: {
          balanceMg: BigInt(newBalance),
          totalSoldPaise: BigInt(newTotalSold),
        },
      });

      const redemption = await tx.goldRedemption.create({
        data: {
          tenantId,
          vaultId: vault.id,
          redemptionType: 'SELL_BACK',
          goldWeightMg: BigInt(weightMg),
          valuePaise: BigInt(amountPaise),
          status: 'PROCESSING', // Will be delivered as bank transfer
          deliveryAddressId: addressId, // In this case, stores bank account ref
        },
      });

      await tx.goldTransaction.create({
        data: {
          tenantId,
          vaultId: vault.id,
          transactionType: 'SELL',
          amountPaise: BigInt(amountPaise),
          goldWeightMg: BigInt(weightMg),
          pricePerGramPaise: BigInt(sellPricePerGramPaise),
          pricePer10gPaise: BigInt(sellPricePer10gPaise),
          status: 'COMPLETED',
          reference: `DG-SELLBACK-${Date.now()}`,
          processedAt: new Date(),
        },
      });

      return { redemption, newBalance };
    });

    this.logger.log(
      `Sell back: customer=${customerId}, weight=${weightMg}mg, amount=${amountPaise}p`,
    );

    return {
      redemptionId: result.redemption.id,
      redemptionType: 'SELL_BACK' as GoldRedemptionType,
      goldWeightMg: weightMg,
      valuePaise: amountPaise,
      status: 'PROCESSING' as GoldRedemptionStatus,
      newBalanceMg: result.newBalance,
    };
  }

  // ─── Get Customer Redemptions ─────────────────────────────────

  async getRedemptions(tenantId: string, customerId: string): Promise<RedeemGoldResponse[]> {
    const vault = await this.prisma.goldVault.findUnique({
      where: { tenantId_customerId: { tenantId, customerId } },
    });

    if (!vault) return [];

    const redemptions = await this.prisma.goldRedemption.findMany({
      where: { tenantId, vaultId: vault.id },
      orderBy: { createdAt: 'desc' },
    });

    return redemptions.map((r) => ({
      redemptionId: r.id,
      redemptionType: r.redemptionType as GoldRedemptionType,
      goldWeightMg: Number(r.goldWeightMg),
      valuePaise: Number(r.valuePaise),
      status: r.status as GoldRedemptionStatus,
      newBalanceMg: Number(vault.balanceMg), // Current balance
    }));
  }

  // ─── Update Redemption Status (admin) ─────────────────────────

  async updateRedemptionStatus(
    tenantId: string,
    redemptionId: string,
    status: GoldRedemptionStatus,
    trackingNumber?: string,
  ): Promise<void> {
    const redemption = await this.prisma.goldRedemption.findFirst({
      where: this.tenantWhere(tenantId, { id: redemptionId }) as Record<string, unknown>,
    });

    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }

    const updateData: Record<string, unknown> = { status };

    if (status === 'SHIPPED' && trackingNumber) {
      updateData.trackingNumber = trackingNumber;
      updateData.shippedAt = new Date();
    }

    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    await this.prisma.goldRedemption.update({
      where: { id: redemptionId },
      data: updateData,
    });

    this.logger.log(`Redemption ${redemptionId} status updated to ${status}`);
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async getActiveVault(tenantId: string, customerId: string) {
    const vault = await this.prisma.goldVault.findUnique({
      where: { tenantId_customerId: { tenantId, customerId } },
    });

    if (!vault) {
      throw new NotFoundException('Gold vault not found');
    }

    if (!vault.isActive) {
      throw new ForbiddenException('Gold vault is deactivated');
    }

    return vault;
  }
}
