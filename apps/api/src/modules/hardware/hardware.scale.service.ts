// ─── Hardware Weighing Scale Service ──────────────────────────
// Weight reading processing, tare handling, pricing, tolerance checks.

import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  WeightReading,
  WeightCaptureRequest,
  WeightCaptureResponse,
  WeightPricingRequest,
  WeightPricingResponse,
  WeightToleranceCheck,
  WeightToleranceResult,
} from '@caratflow/shared-types';

/** In-memory tare weight storage per device (keyed by tenantId:deviceId) */
const tareWeights = new Map<string, number>();

/** In-memory last reading per device (keyed by tenantId:deviceId) */
const lastReadings = new Map<string, WeightReading>();

@Injectable()
export class HardwareScaleService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Process a weight reading from a scale device.
   * Converts to milligrams, stores the latest reading.
   */
  processReading(tenantId: string, reading: WeightReading): WeightReading {
    // Ensure weight in milligrams is consistent with grams
    const normalizedReading: WeightReading = {
      ...reading,
      weightMg: reading.weightMg > 0
        ? reading.weightMg
        : Math.round(reading.weightGrams * 1000),
      weightGrams: reading.weightGrams > 0
        ? reading.weightGrams
        : reading.weightMg / 1000,
    };

    // Store latest reading
    const key = `${tenantId}:${reading.deviceId}`;
    lastReadings.set(key, normalizedReading);

    return normalizedReading;
  }

  /**
   * Set tare weight for a device.
   */
  setTare(tenantId: string, deviceId: string, tareWeightMg: number): void {
    const key = `${tenantId}:${deviceId}`;
    tareWeights.set(key, tareWeightMg);
  }

  /**
   * Get current tare weight for a device.
   */
  getTare(tenantId: string, deviceId: string): number {
    const key = `${tenantId}:${deviceId}`;
    return tareWeights.get(key) ?? 0;
  }

  /**
   * Clear tare weight for a device.
   */
  clearTare(tenantId: string, deviceId: string): void {
    const key = `${tenantId}:${deviceId}`;
    tareWeights.delete(key);
  }

  /**
   * Capture weight for POS / billing.
   * Returns a single stable reading with tare subtracted.
   */
  captureWeight(tenantId: string, input: WeightCaptureRequest): WeightCaptureResponse {
    const key = `${tenantId}:${input.deviceId}`;
    const lastReading = lastReadings.get(key);

    if (!lastReading) {
      throw new BadRequestException('No weight reading available from scale. Place item on scale first.');
    }

    if (!lastReading.isStable) {
      throw new BadRequestException('Scale reading is not stable. Wait for stable reading before capturing.');
    }

    const tareWeightMg = input.tareWeightMg ?? tareWeights.get(key) ?? 0;
    const grossWeightMg = lastReading.weightMg;
    const netWeightMg = Math.max(0, grossWeightMg - tareWeightMg);

    return {
      grossWeightMg,
      tareWeightMg,
      netWeightMg,
      isStable: lastReading.isStable,
      capturedAt: new Date().toISOString(),
    };
  }

  /**
   * Get the last reading from a specific scale.
   */
  getLastReading(tenantId: string, deviceId: string): WeightReading | null {
    const key = `${tenantId}:${deviceId}`;
    return lastReadings.get(key) ?? null;
  }

  /**
   * Weight-based pricing: given weight + current rate + purity, calculate metal value.
   * Weight is in milligrams, rate is paise per gram.
   */
  calculateWeightPrice(input: WeightPricingRequest): WeightPricingResponse {
    const { weightMg, metalRatePaisePerGram, purityFineness } = input;

    const weightGrams = weightMg / 1000;
    // Pure weight = gross weight * (fineness / 999)
    const pureWeightMg = Math.round(weightMg * (purityFineness / 999));
    const pureWeightGrams = pureWeightMg / 1000;

    // Metal value = pure weight in grams * rate per gram
    const metalValuePaise = Math.round(pureWeightGrams * metalRatePaisePerGram);

    return {
      weightMg,
      weightGrams,
      purityFineness,
      pureWeightMg,
      metalRatePaisePerGram,
      metalValuePaise,
    };
  }

  /**
   * Tolerance validation: compare scale reading vs product's stored weight.
   */
  checkTolerance(input: WeightToleranceCheck): WeightToleranceResult {
    const { scaleWeightMg, storedWeightMg, tolerancePercent } = input;

    const differenceMg = scaleWeightMg - storedWeightMg;
    const differencePercent = storedWeightMg > 0
      ? (Math.abs(differenceMg) / storedWeightMg) * 100
      : 0;
    const withinTolerance = differencePercent <= tolerancePercent;

    return {
      scaleWeightMg,
      storedWeightMg,
      differenceMg,
      differencePercent: Math.round(differencePercent * 100) / 100,
      withinTolerance,
      tolerancePercent,
    };
  }
}
