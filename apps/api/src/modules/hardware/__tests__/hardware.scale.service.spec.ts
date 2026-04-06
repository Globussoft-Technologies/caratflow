import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { HardwareScaleService } from '../hardware.scale.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

describe('HardwareScaleService (Unit)', () => {
  let service: HardwareScaleService;

  beforeEach(() => {
    const mockPrisma = createMockPrismaService();
    service = new HardwareScaleService(mockPrisma as any);
  });

  describe('processReading', () => {
    it('normalizes weight from grams to milligrams', () => {
      const result = service.processReading(TEST_TENANT_ID, {
        deviceId: 'scale-1', weightMg: 0, weightGrams: 5.5, isStable: true,
      } as any);

      expect(result.weightMg).toBe(5500);
      expect(result.weightGrams).toBe(5.5);
    });

    it('normalizes weight from milligrams to grams', () => {
      const result = service.processReading(TEST_TENANT_ID, {
        deviceId: 'scale-1', weightMg: 3000, weightGrams: 0, isStable: true,
      } as any);

      expect(result.weightGrams).toBe(3);
      expect(result.weightMg).toBe(3000);
    });

    it('stores the latest reading per device', () => {
      service.processReading(TEST_TENANT_ID, {
        deviceId: 'scale-1', weightMg: 5000, weightGrams: 5, isStable: true,
      } as any);

      const last = service.getLastReading(TEST_TENANT_ID, 'scale-1');
      expect(last).not.toBeNull();
      expect(last!.weightMg).toBe(5000);
    });
  });

  describe('setTare / getTare / clearTare', () => {
    it('sets and retrieves tare weight', () => {
      service.setTare(TEST_TENANT_ID, 'scale-1', 500);
      expect(service.getTare(TEST_TENANT_ID, 'scale-1')).toBe(500);
    });

    it('returns 0 when no tare is set', () => {
      expect(service.getTare(TEST_TENANT_ID, 'no-tare')).toBe(0);
    });

    it('clears tare weight', () => {
      service.setTare(TEST_TENANT_ID, 'scale-1', 500);
      service.clearTare(TEST_TENANT_ID, 'scale-1');
      expect(service.getTare(TEST_TENANT_ID, 'scale-1')).toBe(0);
    });
  });

  describe('captureWeight', () => {
    it('returns net weight with tare subtracted', () => {
      service.processReading(TEST_TENANT_ID, {
        deviceId: 'scale-1', weightMg: 10000, weightGrams: 10, isStable: true,
      } as any);
      service.setTare(TEST_TENANT_ID, 'scale-1', 500);

      const result = service.captureWeight(TEST_TENANT_ID, { deviceId: 'scale-1' } as any);

      expect(result.grossWeightMg).toBe(10000);
      expect(result.tareWeightMg).toBe(500);
      expect(result.netWeightMg).toBe(9500);
    });

    it('throws when no reading available', () => {
      expect(() =>
        service.captureWeight(TEST_TENANT_ID, { deviceId: 'empty-scale' } as any),
      ).toThrow(BadRequestException);
    });

    it('throws when reading is not stable', () => {
      service.processReading(TEST_TENANT_ID, {
        deviceId: 'unstable', weightMg: 5000, weightGrams: 5, isStable: false,
      } as any);

      expect(() =>
        service.captureWeight(TEST_TENANT_ID, { deviceId: 'unstable' } as any),
      ).toThrow(BadRequestException);
    });
  });

  describe('calculateWeightPrice', () => {
    it('calculates metal value based on weight, purity, and rate', () => {
      const result = service.calculateWeightPrice({
        weightMg: 10000, // 10g
        metalRatePaisePerGram: 720000, // Rs 7200/g
        purityFineness: 916, // 22K
      } as any);

      expect(result.pureWeightMg).toBe(Math.round(10000 * (916 / 999)));
      expect(result.metalValuePaise).toBeGreaterThan(0);
      expect(result.weightGrams).toBe(10);
    });

    it('returns zero for zero weight', () => {
      const result = service.calculateWeightPrice({
        weightMg: 0, metalRatePaisePerGram: 720000, purityFineness: 999,
      } as any);

      expect(result.metalValuePaise).toBe(0);
    });
  });

  describe('checkTolerance', () => {
    it('returns within tolerance when difference is small', () => {
      const result = service.checkTolerance({
        scaleWeightMg: 5010, storedWeightMg: 5000, tolerancePercent: 1,
      } as any);

      expect(result.withinTolerance).toBe(true);
      expect(result.differenceMg).toBe(10);
    });

    it('returns outside tolerance when difference is large', () => {
      const result = service.checkTolerance({
        scaleWeightMg: 5500, storedWeightMg: 5000, tolerancePercent: 1,
      } as any);

      expect(result.withinTolerance).toBe(false);
      expect(result.differencePercent).toBe(10);
    });

    it('handles zero stored weight', () => {
      const result = service.checkTolerance({
        scaleWeightMg: 100, storedWeightMg: 0, tolerancePercent: 5,
      } as any);

      expect(result.withinTolerance).toBe(true);
    });
  });
});
