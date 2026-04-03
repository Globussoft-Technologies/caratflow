// ─── Exchange Rate Service ────────────────────────────────────────
// Exchange rate management: record rates (manual or RBI reference rate),
// get current rate, historical rates, lock rate for invoice.

import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExchangeRateInput, ExchangeRateResponse } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExportExchangeRateService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Record Exchange Rate ───────────────────────────────────────

  async recordRate(
    tenantId: string,
    userId: string,
    input: ExchangeRateInput,
  ): Promise<ExchangeRateResponse> {
    const rateId = uuidv4();

    await this.prisma.exchangeRateHistory.create({
      data: {
        id: rateId,
        tenantId,
        fromCurrency: input.fromCurrency.toUpperCase(),
        toCurrency: input.toCurrency.toUpperCase(),
        rate: input.rate,
        source: input.source,
        recordedDate: new Date(),
        effectiveDate: input.effectiveDate,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.getRate(tenantId, rateId);
  }

  // ─── Get Rate by ID ────────────────────────────────────────────

  async getRate(tenantId: string, rateId: string): Promise<ExchangeRateResponse> {
    const rate = await this.prisma.exchangeRateHistory.findFirst({
      where: this.tenantWhere(tenantId, { id: rateId }) as { tenantId: string; id: string },
    });
    if (!rate) throw new NotFoundException('Exchange rate not found');
    return this.mapRateToResponse(rate);
  }

  // ─── Get Current Rate ──────────────────────────────────────────

  async getCurrentRate(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRateResponse | null> {
    const rate = await this.prisma.exchangeRateHistory.findFirst({
      where: {
        tenantId,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        effectiveDate: { lte: new Date() },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    return rate ? this.mapRateToResponse(rate) : null;
  }

  // ─── Lock Rate for Invoice ──────────────────────────────────────
  // Returns the current rate as an integer (rate * 10000) for locking

  async lockRateForInvoice(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    const current = await this.getCurrentRate(tenantId, fromCurrency, toCurrency);
    if (!current) {
      throw new NotFoundException(
        `No exchange rate found for ${fromCurrency}/${toCurrency}. Record a rate first.`,
      );
    }
    return current.rate;
  }

  // ─── Historical Rates ──────────────────────────────────────────

  async getHistoricalRates(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<ExchangeRateResponse>> {
    const where = {
      tenantId,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
    };

    const [items, total] = await Promise.all([
      this.prisma.exchangeRateHistory.findMany({
        where,
        orderBy: { effectiveDate: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.exchangeRateHistory.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((r) => this.mapRateToResponse(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── List All Rates ─────────────────────────────────────────────

  async listRates(
    tenantId: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<ExchangeRateResponse>> {
    const where = { tenantId };

    const [items, total] = await Promise.all([
      this.prisma.exchangeRateHistory.findMany({
        where,
        orderBy: { effectiveDate: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.exchangeRateHistory.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((r) => this.mapRateToResponse(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Mapper ─────────────────────────────────────────────────────

  private mapRateToResponse(rate: Record<string, unknown>): ExchangeRateResponse {
    const r = rate as Record<string, unknown>;
    const rateValue = r.rate as number;

    return {
      id: r.id as string,
      fromCurrency: r.fromCurrency as string,
      toCurrency: r.toCurrency as string,
      rate: rateValue,
      rateDecimal: rateValue / 10000,
      source: r.source as string,
      recordedDate: new Date(r.recordedDate as string).toISOString(),
      effectiveDate: new Date(r.effectiveDate as string).toISOString(),
    };
  }
}
