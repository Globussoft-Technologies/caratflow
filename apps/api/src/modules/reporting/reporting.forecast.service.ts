// ─── Reporting Forecast Service ───────────────────────────────
// Demand forecasting using simple moving average + exponential smoothing.
// Reorder point calculation and seasonality analysis.

import { Injectable } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  ForecastResult,
  ForecastDataPoint,
  SeasonalPattern,
} from '@caratflow/shared-types';

@Injectable()
export class ReportingForecastService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Demand forecast using simple moving average + exponential smoothing.
   */
  async demandForecast(
    tenantId: string,
    options: {
      productId?: string;
      categoryId?: string;
      periods: number;
    },
  ): Promise<ForecastResult> {
    const { productId, categoryId, periods } = options;

    // Get historical monthly sales data (last 24 months)
    const lookbackMonths = 24;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - lookbackMonths);

    const whereProduct: Record<string, unknown> = {};
    if (productId) whereProduct.productId = productId;
    if (categoryId) whereProduct.product = { categoryId };

    const lineItems = await this.prisma.saleLineItem.findMany({
      where: {
        tenantId,
        ...whereProduct,
        sale: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
      },
      select: {
        quantity: true,
        sale: { select: { createdAt: true } },
      },
    });

    // Aggregate by month
    const monthlyDemand = new Map<string, number>();
    for (const item of lineItems) {
      const d = item.sale.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyDemand.set(key, (monthlyDemand.get(key) ?? 0) + item.quantity);
    }

    // Build sorted time series
    const sortedMonths = Array.from(monthlyDemand.keys()).sort();
    const historicalData = sortedMonths.map((k) => monthlyDemand.get(k)!);

    if (historicalData.length < 3) {
      return {
        entityId: productId ?? categoryId ?? 'all',
        entityName: productId ? `Product ${productId}` : categoryId ? `Category ${categoryId}` : 'All Products',
        method: 'insufficient_data',
        predictions: [],
        accuracy: 0,
        mape: 0,
      };
    }

    // Simple Moving Average (3-period window)
    const smaWindow = Math.min(3, historicalData.length);
    const smaForecasts = this.simpleMovingAverage(historicalData, smaWindow, periods);

    // Exponential Smoothing (alpha = 0.3)
    const alpha = 0.3;
    const esForecasts = this.exponentialSmoothing(historicalData, alpha, periods);

    // Weighted blend: 40% SMA + 60% ES
    const blended = smaForecasts.map((sma, i) =>
      Math.round(sma * 0.4 + esForecasts[i]! * 0.6),
    );

    // Calculate MAPE using leave-one-out on historical data
    const mape = this.calculateMAPE(historicalData, smaWindow, alpha);

    // Build prediction data points
    const now = new Date();
    const predictions: ForecastDataPoint[] = [];

    // Include last few historical points
    const historyToShow = Math.min(6, historicalData.length);
    for (let i = historicalData.length - historyToShow; i < historicalData.length; i++) {
      predictions.push({
        period: sortedMonths[i]!,
        actual: historicalData[i]!,
        predicted: historicalData[i]!,
        lowerBound: historicalData[i]!,
        upperBound: historicalData[i]!,
        confidence: 1,
      });
    }

    // Add forecast periods
    for (let i = 0; i < periods; i++) {
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + i + 1);
      const period = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;

      const predicted = blended[i] ?? 0;
      const stdDev = this.calculateStdDev(historicalData);
      const confidenceMultiplier = 1 + i * 0.15; // Wider confidence bands further out

      predictions.push({
        period,
        actual: null,
        predicted,
        lowerBound: Math.max(0, Math.round(predicted - stdDev * confidenceMultiplier)),
        upperBound: Math.round(predicted + stdDev * confidenceMultiplier),
        confidence: Math.max(0.5, 1 - i * 0.08),
      });
    }

    return {
      entityId: productId ?? categoryId ?? 'all',
      entityName: productId ? `Product ${productId}` : categoryId ? `Category ${categoryId}` : 'All Products',
      method: 'blended_sma_es',
      predictions,
      accuracy: Math.max(0, Math.round((1 - mape / 100) * 10000) / 100),
      mape: Math.round(mape * 100) / 100,
    };
  }

  /**
   * Reorder point calculation using statistical methods.
   */
  async reorderPointCalculation(
    tenantId: string,
    productId: string,
    leadTimeDays: number,
    serviceLevel: number = 0.95,
  ): Promise<{
    reorderPoint: number;
    safetyStock: number;
    avgDailyDemand: number;
    demandStdDev: number;
  }> {
    // Get daily sales for last 90 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const lineItems = await this.prisma.saleLineItem.findMany({
      where: {
        tenantId,
        productId,
        sale: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
      },
      select: {
        quantity: true,
        sale: { select: { createdAt: true } },
      },
    });

    // Daily demand
    const dailyDemand = new Map<string, number>();
    for (const item of lineItems) {
      const day = item.sale.createdAt.toISOString().split('T')[0]!;
      dailyDemand.set(day, (dailyDemand.get(day) ?? 0) + item.quantity);
    }

    const demands = Array.from(dailyDemand.values());
    const avgDailyDemand =
      demands.length > 0
        ? demands.reduce((s, d) => s + d, 0) / 90 // Average over full 90-day window
        : 0;

    const demandStdDev = this.calculateStdDev(demands);

    // Z-score for service level (approximate)
    const zScore = this.getZScore(serviceLevel);

    // Safety stock = Z * sigma * sqrt(leadTime)
    const safetyStock = Math.ceil(zScore * demandStdDev * Math.sqrt(leadTimeDays));

    // Reorder point = (avg daily demand * lead time) + safety stock
    const reorderPoint = Math.ceil(avgDailyDemand * leadTimeDays) + safetyStock;

    return {
      reorderPoint,
      safetyStock,
      avgDailyDemand: Math.round(avgDailyDemand * 100) / 100,
      demandStdDev: Math.round(demandStdDev * 100) / 100,
    };
  }

  /**
   * Seasonality analysis: identify monthly patterns.
   */
  async seasonalityAnalysis(
    tenantId: string,
    categoryId?: string,
    years: number = 2,
  ): Promise<SeasonalPattern[]> {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);

    const whereProduct: Record<string, unknown> = {};
    if (categoryId) whereProduct.product = { categoryId };

    const lineItems = await this.prisma.saleLineItem.findMany({
      where: {
        tenantId,
        ...whereProduct,
        sale: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
      },
      select: {
        quantity: true,
        lineTotalPaise: true,
        sale: { select: { createdAt: true } },
      },
    });

    // Monthly totals
    const monthlyTotals = new Array(12).fill(0) as number[];
    const monthlyCounts = new Array(12).fill(0) as number[];

    for (const item of lineItems) {
      const month = item.sale.createdAt.getMonth();
      monthlyTotals[month] = (monthlyTotals[month] ?? 0) + item.quantity;
      monthlyCounts[month] = (monthlyCounts[month] ?? 0) + 1;
    }

    // Average demand per month
    const avgMonthly = monthlyTotals.map((total, i) =>
      monthlyCounts[i]! > 0 ? total / Math.ceil(years) : 0,
    );

    const overallAvg =
      avgMonthly.reduce((s, v) => s + v, 0) / 12;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return avgMonthly.map((avg, i) => ({
      month: i + 1,
      monthName: monthNames[i]!,
      avgDemand: Math.round(avg * 100) / 100,
      seasonalIndex:
        overallAvg > 0
          ? Math.round((avg / overallAvg) * 10000) / 10000
          : 0,
    }));
  }

  // ─── Private Helpers ────────────────────────────────────────

  private simpleMovingAverage(
    data: number[],
    window: number,
    periods: number,
  ): number[] {
    const extended = [...data];
    const forecasts: number[] = [];

    for (let i = 0; i < periods; i++) {
      const slice = extended.slice(-window);
      const avg = Math.round(slice.reduce((s, v) => s + v, 0) / slice.length);
      forecasts.push(avg);
      extended.push(avg);
    }

    return forecasts;
  }

  private exponentialSmoothing(
    data: number[],
    alpha: number,
    periods: number,
  ): number[] {
    let level = data[0]!;
    for (let i = 1; i < data.length; i++) {
      level = alpha * data[i]! + (1 - alpha) * level;
    }

    const forecasts: number[] = [];
    for (let i = 0; i < periods; i++) {
      forecasts.push(Math.round(level));
    }

    return forecasts;
  }

  private calculateMAPE(
    data: number[],
    smaWindow: number,
    alpha: number,
  ): number {
    if (data.length < smaWindow + 1) return 100;

    let totalError = 0;
    let count = 0;

    for (let i = smaWindow; i < data.length; i++) {
      const sma =
        data.slice(i - smaWindow, i).reduce((s, v) => s + v, 0) / smaWindow;

      let level = data[0]!;
      for (let j = 1; j < i; j++) {
        level = alpha * data[j]! + (1 - alpha) * level;
      }

      const forecast = Math.round(sma * 0.4 + level * 0.6);
      const actual = data[i]!;

      if (actual > 0) {
        totalError += Math.abs((actual - forecast) / actual);
        count++;
      }
    }

    return count > 0 ? (totalError / count) * 100 : 100;
  }

  private calculateStdDev(data: number[]): number {
    if (data.length < 2) return 0;
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const variance =
      data.reduce((s, v) => s + (v - mean) ** 2, 0) / (data.length - 1);
    return Math.sqrt(variance);
  }

  private getZScore(serviceLevel: number): number {
    // Common Z-scores for service levels
    const zTable: Record<number, number> = {
      0.9: 1.282,
      0.95: 1.645,
      0.97: 1.881,
      0.99: 2.326,
    };

    // Find closest match
    const keys = Object.keys(zTable).map(Number);
    const closest = keys.reduce((prev, curr) =>
      Math.abs(curr - serviceLevel) < Math.abs(prev - serviceLevel) ? curr : prev,
    );

    return zTable[closest] ?? 1.645;
  }
}
