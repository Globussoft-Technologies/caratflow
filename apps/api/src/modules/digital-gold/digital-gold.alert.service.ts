// ─── Digital Gold Price Alert Service ──────────────────────────
// Create, check, and cancel price alerts for gold rate notifications.
// BullMQ cron triggers checkAlerts() periodically.

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { IndiaRatesService } from '../india/india.rates.service';
import type {
  GoldPriceAlertInput,
  GoldPriceAlertResponse,
  GoldPriceAlertType,
  GoldPriceAlertStatus,
} from '@caratflow/shared-types';

/** Digital gold purity (24K fine) */
const DIGITAL_GOLD_PURITY = 999;
/** Maximum active alerts per customer */
const MAX_ALERTS_PER_CUSTOMER = 10;

@Injectable()
export class DigitalGoldAlertService extends TenantAwareService {
  private readonly logger = new Logger(DigitalGoldAlertService.name);

  constructor(
    prisma: PrismaService,
    private readonly ratesService: IndiaRatesService,
  ) {
    super(prisma);
  }

  // ─── Create Alert ─────────────────────────────────────────────

  async createAlert(
    tenantId: string,
    customerId: string,
    input: GoldPriceAlertInput,
  ): Promise<GoldPriceAlertResponse> {
    // Check alert limit
    const activeCount = await this.prisma.goldPriceAlert.count({
      where: { tenantId, customerId, status: 'ACTIVE' },
    });

    if (activeCount >= MAX_ALERTS_PER_CUSTOMER) {
      throw new BadRequestException(
        `Maximum ${MAX_ALERTS_PER_CUSTOMER} active alerts allowed per customer`,
      );
    }

    // Get current rate for reference
    const liveRate = await this.ratesService.getCurrentRate('GOLD', DIGITAL_GOLD_PURITY);

    // Validate target vs current price makes sense
    if (
      input.alertType === 'PRICE_BELOW' &&
      input.targetPricePer10gPaise >= liveRate.ratePer10gPaise
    ) {
      throw new BadRequestException(
        'Target price for PRICE_BELOW alert must be less than current price',
      );
    }

    if (
      input.alertType === 'PRICE_ABOVE' &&
      input.targetPricePer10gPaise <= liveRate.ratePer10gPaise
    ) {
      throw new BadRequestException(
        'Target price for PRICE_ABOVE alert must be greater than current price',
      );
    }

    const alert = await this.prisma.goldPriceAlert.create({
      data: {
        tenantId,
        customerId,
        alertType: input.alertType,
        targetPricePer10gPaise: BigInt(input.targetPricePer10gPaise),
        currentPricePer10gPaise: BigInt(liveRate.ratePer10gPaise),
        status: 'ACTIVE',
      },
    });

    this.logger.log(
      `Price alert created: customer=${customerId}, type=${input.alertType}, target=${input.targetPricePer10gPaise}`,
    );

    return this.toAlertResponse(alert);
  }

  // ─── Cancel Alert ─────────────────────────────────────────────

  async cancelAlert(tenantId: string, customerId: string, alertId: string): Promise<void> {
    const alert = await this.prisma.goldPriceAlert.findFirst({
      where: { id: alertId, tenantId, customerId, status: 'ACTIVE' },
    });

    if (!alert) {
      throw new NotFoundException('Active alert not found');
    }

    await this.prisma.goldPriceAlert.update({
      where: { id: alertId },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`Price alert cancelled: ${alertId}`);
  }

  // ─── Get Customer Alerts ──────────────────────────────────────

  async getCustomerAlerts(
    tenantId: string,
    customerId: string,
  ): Promise<GoldPriceAlertResponse[]> {
    const alerts = await this.prisma.goldPriceAlert.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map(this.toAlertResponse);
  }

  // ─── Check Alerts (BullMQ Cron) ───────────────────────────────

  async checkAlerts(): Promise<{ triggered: number }> {
    let liveRate;
    try {
      liveRate = await this.ratesService.getCurrentRate('GOLD', DIGITAL_GOLD_PURITY);
    } catch {
      this.logger.warn('Cannot check price alerts: rate not available');
      return { triggered: 0 };
    }

    const currentPricePer10gPaise = liveRate.ratePer10gPaise;

    // Find PRICE_BELOW alerts where current price has dropped to or below target
    const belowAlerts = await this.prisma.goldPriceAlert.findMany({
      where: {
        status: 'ACTIVE',
        alertType: 'PRICE_BELOW',
        targetPricePer10gPaise: { gte: BigInt(currentPricePer10gPaise) },
      },
    });

    // Find PRICE_ABOVE alerts where current price has risen to or above target
    const aboveAlerts = await this.prisma.goldPriceAlert.findMany({
      where: {
        status: 'ACTIVE',
        alertType: 'PRICE_ABOVE',
        targetPricePer10gPaise: { lte: BigInt(currentPricePer10gPaise) },
      },
    });

    const triggeredAlerts = [...belowAlerts, ...aboveAlerts];

    if (triggeredAlerts.length === 0) {
      return { triggered: 0 };
    }

    // Update all triggered alerts
    const alertIds = triggeredAlerts.map((a) => a.id);
    await this.prisma.goldPriceAlert.updateMany({
      where: { id: { in: alertIds } },
      data: {
        status: 'TRIGGERED',
        triggeredAt: new Date(),
        currentPricePer10gPaise: BigInt(currentPricePer10gPaise),
      },
    });

    // In production, emit notification events for each triggered alert
    for (const alert of triggeredAlerts) {
      this.logger.log(
        `Price alert triggered: alertId=${alert.id}, customer=${alert.customerId}, ` +
        `type=${alert.alertType}, target=${alert.targetPricePer10gPaise}, current=${currentPricePer10gPaise}`,
      );
    }

    this.logger.log(`Price alert check complete: ${triggeredAlerts.length} alerts triggered`);
    return { triggered: triggeredAlerts.length };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private toAlertResponse(alert: {
    id: string;
    customerId: string;
    alertType: string;
    targetPricePer10gPaise: bigint;
    currentPricePer10gPaise: bigint;
    status: string;
    triggeredAt: Date | null;
    createdAt: Date;
  }): GoldPriceAlertResponse {
    return {
      id: alert.id,
      customerId: alert.customerId,
      alertType: alert.alertType as GoldPriceAlertType,
      targetPricePer10gPaise: Number(alert.targetPricePer10gPaise),
      currentPricePer10gPaise: Number(alert.currentPricePer10gPaise),
      status: alert.status as GoldPriceAlertStatus,
      triggeredAt: alert.triggeredAt?.toISOString() ?? null,
      createdAt: alert.createdAt.toISOString(),
    };
  }
}
