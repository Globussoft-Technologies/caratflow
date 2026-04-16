// ─── Digital Gold SIP Service ──────────────────────────────────
// Systematic Investment Plan: create, pause, resume, cancel, execute.
// BullMQ cron triggers executeDueSips() daily.

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
import { DigitalGoldService } from './digital-gold.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import {
  PaymentGatewayService,
  PaymentMethodNotFoundError,
  PaymentMethodExpiredError,
  PaymentGatewayDeclinedError,
  PaymentGatewayTransientError,
} from '../bnpl/payment-gateway.service';
import { v4 as uuidv4 } from 'uuid';
import type {
  CreateSipInput,
  SipResponse,
  SipExecutionResponse,
  GoldSipStatus,
  GoldSipType,
  GoldSipFrequency,
  SipExecutionStatus,
} from '@caratflow/shared-types';

/** Maximum consecutive SIP payment failures before auto-pause */
const MAX_CONSECUTIVE_FAILURES = 3;
/** Digital gold purity (24K fine) */
const DIGITAL_GOLD_PURITY = 999;
/** Buy spread per 10g in paise */
const BUY_SPREAD_PER_10G_PAISE = 5_000;

@Injectable()
export class DigitalGoldSipService extends TenantAwareService {
  private readonly logger = new Logger(DigitalGoldSipService.name);

  constructor(
    prisma: PrismaService,
    private readonly ratesService: IndiaRatesService,
    private readonly digitalGoldService: DigitalGoldService,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Create SIP ───────────────────────────────────────────────

  async createSip(
    tenantId: string,
    customerId: string,
    input: CreateSipInput,
  ): Promise<SipResponse> {
    const vault = await this.digitalGoldService.getOrCreateVault(tenantId, customerId);

    const nextDeductionDate = this.calculateNextDeductionDate(
      input.frequency,
      input.startDate,
      input.dayOfMonth,
      input.dayOfWeek,
    );

    const sip = await this.prisma.goldSip.create({
      data: {
        tenantId,
        vaultId: vault.id,
        customerId,
        sipType: input.sipType,
        amountPaise: input.amountPaise ? BigInt(input.amountPaise) : null,
        weightMg: input.weightMg ? BigInt(input.weightMg) : null,
        frequency: input.frequency,
        dayOfMonth: input.dayOfMonth ?? null,
        dayOfWeek: input.dayOfWeek ?? null,
        status: 'ACTIVE',
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        nextDeductionDate,
        paymentMethod: input.paymentMethod,
        autoDebitReference: input.autoDebitReference ?? null,
      },
    });

    this.logger.log(
      `SIP created: id=${sip.id}, customer=${customerId}, type=${input.sipType}, freq=${input.frequency}`,
    );

    return this.toSipResponse(sip);
  }

  // ─── Pause SIP ────────────────────────────────────────────────

  async pauseSip(tenantId: string, sipId: string): Promise<SipResponse> {
    const sip = await this.getSipOrThrow(tenantId, sipId);

    if (sip.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot pause SIP in ${sip.status} status`);
    }

    const updated = await this.prisma.goldSip.update({
      where: { id: sipId },
      data: { status: 'PAUSED' },
    });

    this.logger.log(`SIP paused: ${sipId}`);
    return this.toSipResponse(updated);
  }

  // ─── Resume SIP ───────────────────────────────────────────────

  async resumeSip(tenantId: string, sipId: string): Promise<SipResponse> {
    const sip = await this.getSipOrThrow(tenantId, sipId);

    if (sip.status !== 'PAUSED') {
      throw new BadRequestException(`Cannot resume SIP in ${sip.status} status`);
    }

    const nextDeductionDate = this.calculateNextDeductionDate(
      sip.frequency as GoldSipFrequency,
      new Date(),
      sip.dayOfMonth,
      sip.dayOfWeek,
    );

    const updated = await this.prisma.goldSip.update({
      where: { id: sipId },
      data: {
        status: 'ACTIVE',
        nextDeductionDate,
        failedDeductions: 0, // Reset failure counter on resume
      },
    });

    this.logger.log(`SIP resumed: ${sipId}`);
    return this.toSipResponse(updated);
  }

  // ─── Cancel SIP ───────────────────────────────────────────────

  async cancelSip(tenantId: string, sipId: string): Promise<SipResponse> {
    const sip = await this.getSipOrThrow(tenantId, sipId);

    if (sip.status === 'CANCELLED' || sip.status === 'COMPLETED') {
      throw new BadRequestException(`SIP is already ${sip.status}`);
    }

    const updated = await this.prisma.goldSip.update({
      where: { id: sipId },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`SIP cancelled: ${sipId}`);
    return this.toSipResponse(updated);
  }

  // ─── Get SIP Details ──────────────────────────────────────────

  async getSip(tenantId: string, sipId: string): Promise<SipResponse> {
    const sip = await this.getSipOrThrow(tenantId, sipId);
    return this.toSipResponse(sip);
  }

  // ─── Get Customer SIPs ────────────────────────────────────────

  async getCustomerSips(tenantId: string, customerId: string): Promise<SipResponse[]> {
    const sips = await this.prisma.goldSip.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    });
    return sips.map((s) => this.toSipResponse(s));
  }

  // ─── Get SIP Execution History ────────────────────────────────

  async getSipHistory(tenantId: string, sipId: string): Promise<SipExecutionResponse[]> {
    await this.getSipOrThrow(tenantId, sipId);

    const executions = await this.prisma.sipExecution.findMany({
      where: { tenantId, sipId },
      orderBy: { executionDate: 'desc' },
      take: 100,
    });

    return executions.map(this.toExecutionResponse);
  }

  // ─── Execute Single SIP ───────────────────────────────────────

  async executeSip(sipId: string): Promise<void> {
    const sip = await this.prisma.goldSip.findUnique({ where: { id: sipId } });
    if (!sip || sip.status !== 'ACTIVE') {
      this.logger.warn(`SIP ${sipId} not found or not active, skipping execution`);
      return;
    }

    const tenantId = sip.tenantId;
    let amountPaise = 0;
    let goldWeightMg = 0;

    try {
      const liveRate = await this.ratesService.getCurrentRate('GOLD', DIGITAL_GOLD_PURITY);
      const buyPricePer10gPaise = liveRate.ratePer10gPaise + BUY_SPREAD_PER_10G_PAISE;
      const buyPricePerGramPaise = Math.round(buyPricePer10gPaise / 10);

      if (sip.sipType === 'FIXED_AMOUNT') {
        amountPaise = Number(sip.amountPaise!);
        goldWeightMg = Math.floor((amountPaise * 1000) / buyPricePerGramPaise);
      } else {
        // FIXED_WEIGHT
        goldWeightMg = Number(sip.weightMg!);
        amountPaise = Math.ceil((goldWeightMg * buyPricePerGramPaise) / 1000);
      }

      if (!sip.autoDebitReference) {
        throw new PaymentMethodNotFoundError(
          `SIP ${sipId} has no autoDebitReference (SavedPaymentMethod.id) configured`,
        );
      }

      // Process payment via gateway using the customer's saved method.
      // `autoDebitReference` stores the SavedPaymentMethod.id that the
      // customer authorized when the SIP was created.
      const chargeReference = `DG-SIP-${sip.id.slice(0, 8)}-${Date.now()}`;
      const charge = await this.paymentGateway.chargeSavedMethod({
        tenantId,
        customerId: sip.customerId,
        savedMethodId: sip.autoDebitReference,
        amountPaise,
        reference: chargeReference,
      });

      if (charge.status === 'FAILED') {
        throw new PaymentGatewayDeclinedError(
          `Charge returned FAILED status for ${chargeReference}`,
          'CHARGE_FAILED',
        );
      }

      // Create transaction and update vault atomically
      const result = await this.prisma.$transaction(async (tx) => {
        const transaction = await tx.goldTransaction.create({
          data: {
            tenantId,
            vaultId: sip.vaultId,
            transactionType: 'SIP_BUY',
            amountPaise: BigInt(amountPaise),
            goldWeightMg: BigInt(goldWeightMg),
            pricePerGramPaise: BigInt(buyPricePerGramPaise),
            pricePer10gPaise: BigInt(buyPricePer10gPaise),
            status: 'COMPLETED',
            paymentMethod: sip.paymentMethod,
            reference: `${chargeReference}:${charge.chargeId}`,
            processedAt: new Date(),
          },
        });

        // Update vault balance
        const vault = await tx.goldVault.findUnique({ where: { id: sip.vaultId } });
        if (!vault) throw new Error('Vault not found');

        const newBalance = Number(vault.balanceMg) + goldWeightMg;
        const newInvested = Number(vault.totalInvestedPaise) + amountPaise;
        const newAvgPrice = newBalance > 0
          ? Math.round((newInvested * 10_000) / newBalance)
          : 0;

        await tx.goldVault.update({
          where: { id: vault.id },
          data: {
            balanceMg: BigInt(newBalance),
            totalInvestedPaise: BigInt(newInvested),
            avgBuyPricePer10gPaise: BigInt(newAvgPrice),
          },
        });

        // Record successful execution
        const execution = await tx.sipExecution.create({
          data: {
            tenantId,
            sipId: sip.id,
            executionDate: new Date(),
            amountPaise: BigInt(amountPaise),
            goldWeightMg: BigInt(goldWeightMg),
            pricePerGramPaise: BigInt(buyPricePerGramPaise),
            status: 'SUCCESS',
            transactionId: transaction.id,
          },
        });

        // Update SIP: advance next deduction date
        const nextDate = this.calculateNextDeductionDate(
          sip.frequency as GoldSipFrequency,
          sip.nextDeductionDate,
          sip.dayOfMonth,
          sip.dayOfWeek,
        );

        const sipUpdate: Record<string, unknown> = {
          totalDeductions: sip.totalDeductions + 1,
          failedDeductions: 0, // Reset on success
          nextDeductionDate: nextDate,
        };

        // Check if SIP has reached end date
        if (sip.endDate && nextDate > sip.endDate) {
          sipUpdate.status = 'COMPLETED';
        }

        await tx.goldSip.update({ where: { id: sip.id }, data: sipUpdate });

        return { transaction, execution };
      });

      this.logger.log(
        `SIP executed: sip=${sipId}, amount=${amountPaise}p, weight=${goldWeightMg}mg, ` +
          `charge=${charge.chargeId} (${charge.provider})`,
      );

      // Emit success event
      try {
        await this.eventBus.publish({
          id: uuidv4(),
          tenantId,
          userId: 'SYSTEM',
          timestamp: new Date().toISOString(),
          type: 'digital-gold.sip.executed',
          payload: {
            sipId: sip.id,
            executionId: result.execution.id,
            customerId: sip.customerId,
            amountPaise,
            goldWeightMg,
          },
        });
      } catch (publishErr) {
        this.logger.warn(
          `Failed to publish digital-gold.sip.executed for ${sipId}: ${
            publishErr instanceof Error ? publishErr.message : String(publishErr)
          }`,
        );
      }
    } catch (error) {
      // Transient errors (network, 5xx) bubble up so BullMQ can retry the
      // whole job with exponential backoff before we ever touch the SIP
      // failure counter. This prevents double-counting a single outage.
      if (error instanceof PaymentGatewayTransientError) {
        this.logger.warn(
          `SIP ${sipId} transient failure, will be retried by queue: ${error.message}`,
        );
        throw error;
      }

      const failureReason = error instanceof Error ? error.message : 'Unknown error';
      const errorCode =
        error instanceof PaymentGatewayDeclinedError
          ? error.code
          : error instanceof PaymentMethodExpiredError
            ? 'METHOD_EXPIRED'
            : error instanceof PaymentMethodNotFoundError
              ? 'METHOD_NOT_FOUND'
              : 'UNKNOWN';

      const newFailedCount = sip.failedDeductions + 1;
      let autoPaused = false;

      await this.prisma.$transaction(async (tx) => {
        await tx.sipExecution.create({
          data: {
            tenantId,
            sipId: sip.id,
            executionDate: new Date(),
            amountPaise: BigInt(amountPaise || Number(sip.amountPaise ?? 0n)),
            goldWeightMg: BigInt(goldWeightMg || Number(sip.weightMg ?? 0n)),
            pricePerGramPaise: 0n,
            status: 'FAILED',
            failureReason: `${errorCode}: ${failureReason}`.slice(0, 500),
          },
        });

        if (newFailedCount >= MAX_CONSECUTIVE_FAILURES) {
          // Auto-pause after max consecutive failures
          await tx.goldSip.update({
            where: { id: sip.id },
            data: {
              status: 'PAUSED',
              failedDeductions: newFailedCount,
            },
          });
          autoPaused = true;
          this.logger.warn(
            `SIP ${sipId} auto-paused after ${MAX_CONSECUTIVE_FAILURES} consecutive failures (${errorCode})`,
          );
        } else {
          // Retry next day
          const retryDate = new Date();
          retryDate.setDate(retryDate.getDate() + 1);

          await tx.goldSip.update({
            where: { id: sip.id },
            data: {
              failedDeductions: newFailedCount,
              nextDeductionDate: retryDate,
            },
          });
          this.logger.warn(
            `SIP ${sipId} execution failed (attempt ${newFailedCount}/${MAX_CONSECUTIVE_FAILURES}): ${errorCode}`,
          );
        }
      });

      // Emit failure event
      try {
        await this.eventBus.publish({
          id: uuidv4(),
          tenantId,
          userId: 'SYSTEM',
          timestamp: new Date().toISOString(),
          type: 'digital-gold.sip.failed',
          payload: {
            sipId: sip.id,
            customerId: sip.customerId,
            amountPaise: amountPaise || Number(sip.amountPaise ?? 0n),
            reason: `${errorCode}: ${failureReason}`.slice(0, 500),
            attemptCount: newFailedCount,
            autoPaused,
          },
        });
      } catch (publishErr) {
        this.logger.warn(
          `Failed to publish digital-gold.sip.failed for ${sipId}: ${
            publishErr instanceof Error ? publishErr.message : String(publishErr)
          }`,
        );
      }
    }
  }

  // ─── Execute All Due SIPs (BullMQ Cron) ───────────────────────

  async executeDueSips(): Promise<{ executed: number; failed: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueSips = await this.prisma.goldSip.findMany({
      where: {
        status: 'ACTIVE',
        nextDeductionDate: { gte: today, lt: tomorrow },
      },
    });

    this.logger.log(`Found ${dueSips.length} SIPs due for execution today`);

    let executed = 0;
    let failed = 0;

    for (const sip of dueSips) {
      try {
        await this.executeSip(sip.id);
        executed++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to execute SIP ${sip.id}`, error);
      }
    }

    this.logger.log(`SIP execution complete: ${executed} executed, ${failed} failed`);
    return { executed, failed };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async getSipOrThrow(tenantId: string, sipId: string) {
    const sip = await this.prisma.goldSip.findFirst({
      where: this.tenantWhere(tenantId, { id: sipId }) as Record<string, unknown>,
    });

    if (!sip) {
      throw new NotFoundException('SIP not found');
    }

    return sip;
  }

  /** Calculate the next deduction date based on frequency */
  private calculateNextDeductionDate(
    frequency: GoldSipFrequency | string,
    fromDate: Date,
    dayOfMonth?: number | null,
    dayOfWeek?: number | null,
  ): Date {
    const from = new Date(fromDate);
    const now = new Date();
    let next: Date;

    switch (frequency) {
      case 'DAILY': {
        next = from > now ? from : new Date(now);
        next.setDate(next.getDate() + 1);
        break;
      }
      case 'WEEKLY': {
        next = new Date(from > now ? from : now);
        const targetDay = dayOfWeek ?? 1; // Default Monday
        const daysUntilTarget = (targetDay - next.getDay() + 7) % 7;
        next.setDate(next.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
        break;
      }
      case 'MONTHLY': {
        next = new Date(from > now ? from : now);
        const targetDayOfMonth = dayOfMonth ?? 1;
        next.setMonth(next.getMonth() + 1);
        next.setDate(Math.min(targetDayOfMonth, this.daysInMonth(next)));
        break;
      }
      default:
        next = new Date(from);
        next.setMonth(next.getMonth() + 1);
    }

    return next;
  }

  private daysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  private toSipResponse(sip: {
    id: string;
    vaultId: string;
    customerId: string;
    sipType: string;
    amountPaise: bigint | null;
    weightMg: bigint | null;
    frequency: string;
    dayOfMonth: number | null;
    dayOfWeek: number | null;
    status: string;
    startDate: Date;
    endDate: Date | null;
    nextDeductionDate: Date;
    totalDeductions: number;
    failedDeductions: number;
    paymentMethod: string;
    createdAt: Date;
  }): SipResponse {
    return {
      id: sip.id,
      vaultId: sip.vaultId,
      customerId: sip.customerId,
      sipType: sip.sipType as GoldSipType,
      amountPaise: sip.amountPaise ? Number(sip.amountPaise) : null,
      weightMg: sip.weightMg ? Number(sip.weightMg) : null,
      frequency: sip.frequency as GoldSipFrequency,
      dayOfMonth: sip.dayOfMonth,
      dayOfWeek: sip.dayOfWeek,
      status: sip.status as GoldSipStatus,
      startDate: sip.startDate.toISOString(),
      endDate: sip.endDate?.toISOString() ?? null,
      nextDeductionDate: sip.nextDeductionDate.toISOString(),
      totalDeductions: sip.totalDeductions,
      failedDeductions: sip.failedDeductions,
      paymentMethod: sip.paymentMethod,
      createdAt: sip.createdAt.toISOString(),
    };
  }

  private toExecutionResponse(execution: {
    id: string;
    sipId: string;
    executionDate: Date;
    amountPaise: bigint;
    goldWeightMg: bigint;
    pricePerGramPaise: bigint;
    status: string;
    failureReason: string | null;
    transactionId: string | null;
    createdAt: Date;
  }): SipExecutionResponse {
    return {
      id: execution.id,
      sipId: execution.sipId,
      executionDate: execution.executionDate.toISOString(),
      amountPaise: Number(execution.amountPaise),
      goldWeightMg: Number(execution.goldWeightMg),
      pricePerGramPaise: Number(execution.pricePerGramPaise),
      status: execution.status as SipExecutionStatus,
      failureReason: execution.failureReason,
      transactionId: execution.transactionId,
      createdAt: execution.createdAt.toISOString(),
    };
  }
}
