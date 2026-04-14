import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { HardwareScaleService, ScaleSerialDevice } from '../hardware.scale.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

// Mock serialport so the driver falls back to soft mode (or can be observed).
vi.mock('serialport', () => ({ SerialPort: class {} }), { virtual: true } as any);

function mockEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };
}

describe('HardwareScaleService (Unit)', () => {
  let service: HardwareScaleService;
  let eventBus: ReturnType<typeof mockEventBus>;

  beforeEach(() => {
    const mockPrisma = createMockPrismaService();
    eventBus = mockEventBus();
    service = new HardwareScaleService(mockPrisma as any, eventBus as any);
  });

  describe('processReading', () => {
    it('normalizes weight from grams to milligrams and emits event', async () => {
      const result = await service.processReading(TEST_TENANT_ID, {
        deviceId: 'scale-1',
        weightMg: 0,
        weightGrams: 5.5,
        isStable: true,
        unit: 'g',
        timestamp: new Date().toISOString(),
      } as any);

      expect(result.weightMg).toBe(5500);
      expect(result.weightGrams).toBe(5.5);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hardware.scale.read',
          payload: expect.objectContaining({ deviceId: 'scale-1', weightMg: 5500, isStable: true }),
        }),
      );
    });

    it('normalizes weight from milligrams when grams is zero', async () => {
      const result = await service.processReading(TEST_TENANT_ID, {
        deviceId: 'scale-1',
        weightMg: 3000,
        weightGrams: 0,
        isStable: true,
        unit: 'g',
        timestamp: new Date().toISOString(),
      } as any);

      expect(result.weightGrams).toBe(3);
      expect(result.weightMg).toBe(3000);
    });

    it('stores the latest reading per device (tenant-scoped)', async () => {
      await service.processReading(TEST_TENANT_ID, {
        deviceId: 'scale-a',
        weightMg: 5000,
        weightGrams: 5,
        isStable: true,
        unit: 'g',
        timestamp: new Date().toISOString(),
      } as any);

      const last = service.getLastReading(TEST_TENANT_ID, 'scale-a');
      expect(last).not.toBeNull();
      expect(last!.weightMg).toBe(5000);

      // Other tenant / other device should not see it
      expect(service.getLastReading('other-tenant', 'scale-a')).toBeNull();
    });
  });

  describe('setTare / getTare / clearTare', () => {
    it('sets and retrieves tare weight', () => {
      service.setTare(TEST_TENANT_ID, 'scale-t', 500);
      expect(service.getTare(TEST_TENANT_ID, 'scale-t')).toBe(500);
    });

    it('returns 0 when no tare is set', () => {
      expect(service.getTare(TEST_TENANT_ID, 'no-tare-device')).toBe(0);
    });

    it('clears tare weight', () => {
      service.setTare(TEST_TENANT_ID, 'scale-clear', 500);
      service.clearTare(TEST_TENANT_ID, 'scale-clear');
      expect(service.getTare(TEST_TENANT_ID, 'scale-clear')).toBe(0);
    });
  });

  describe('captureWeight', () => {
    it('returns net weight with tare subtracted', async () => {
      await service.processReading(TEST_TENANT_ID, {
        deviceId: 'scale-c',
        weightMg: 10000,
        weightGrams: 10,
        isStable: true,
        unit: 'g',
        timestamp: new Date().toISOString(),
      } as any);
      service.setTare(TEST_TENANT_ID, 'scale-c', 500);

      const result = service.captureWeight(TEST_TENANT_ID, { deviceId: 'scale-c' } as any);

      expect(result.grossWeightMg).toBe(10000);
      expect(result.tareWeightMg).toBe(500);
      expect(result.netWeightMg).toBe(9500);
      expect(result.isStable).toBe(true);
    });

    it('throws when no reading available', () => {
      expect(() =>
        service.captureWeight(TEST_TENANT_ID, { deviceId: 'empty-scale' } as any),
      ).toThrow(BadRequestException);
    });

    it('throws when reading is not stable', async () => {
      await service.processReading(TEST_TENANT_ID, {
        deviceId: 'unstable-scale',
        weightMg: 5000,
        weightGrams: 5,
        isStable: false,
        unit: 'g',
        timestamp: new Date().toISOString(),
      } as any);

      expect(() =>
        service.captureWeight(TEST_TENANT_ID, { deviceId: 'unstable-scale' } as any),
      ).toThrow(BadRequestException);
    });

    it('allows an explicit tare override via request payload', async () => {
      await service.processReading(TEST_TENANT_ID, {
        deviceId: 'scale-override',
        weightMg: 10000,
        weightGrams: 10,
        isStable: true,
        unit: 'g',
        timestamp: new Date().toISOString(),
      } as any);

      const result = service.captureWeight(TEST_TENANT_ID, {
        deviceId: 'scale-override',
        tareWeightMg: 2000,
      } as any);

      expect(result.tareWeightMg).toBe(2000);
      expect(result.netWeightMg).toBe(8000);
    });
  });

  describe('calculateWeightPrice', () => {
    it('calculates metal value based on weight, purity, and rate', () => {
      const result = service.calculateWeightPrice({
        weightMg: 10000,
        metalRatePaisePerGram: 720000,
        purityFineness: 916,
      } as any);

      expect(result.pureWeightMg).toBe(Math.round(10000 * (916 / 999)));
      expect(result.metalValuePaise).toBeGreaterThan(0);
      expect(result.weightGrams).toBe(10);
    });

    it('returns zero for zero weight', () => {
      const result = service.calculateWeightPrice({
        weightMg: 0,
        metalRatePaisePerGram: 720000,
        purityFineness: 999,
      } as any);
      expect(result.metalValuePaise).toBe(0);
    });
  });

  describe('checkTolerance', () => {
    it('reports within tolerance when difference is small', () => {
      const result = service.checkTolerance({
        scaleWeightMg: 5010,
        storedWeightMg: 5000,
        tolerancePercent: 1,
      } as any);
      expect(result.withinTolerance).toBe(true);
      expect(result.differenceMg).toBe(10);
    });

    it('reports outside tolerance when difference is large', () => {
      const result = service.checkTolerance({
        scaleWeightMg: 5500,
        storedWeightMg: 5000,
        tolerancePercent: 1,
      } as any);
      expect(result.withinTolerance).toBe(false);
      expect(result.differencePercent).toBe(10);
    });

    it('handles zero stored weight (no division by zero)', () => {
      const result = service.checkTolerance({
        scaleWeightMg: 100,
        storedWeightMg: 0,
        tolerancePercent: 5,
      } as any);
      expect(result.withinTolerance).toBe(true);
    });
  });

  // ─── Protocol Parser Coverage ──────────────────────────────────
  // `parseLine` is a private method; exercise it via `new ScaleSerialDevice(...)`
  // and invoking the private member directly through a bracket cast.

  describe('ScaleSerialDevice.parseLine (protocol parsers)', () => {
    const make = (protocol: 'METTLER_SICS' | 'AND' | 'GENERIC' | 'CONTINUOUS') =>
      new ScaleSerialDevice('dev-x', '/dev/null', 9600, protocol, () => {});

    it('parses Mettler Toledo SICS stable/unstable lines', () => {
      const dev = make('METTLER_SICS') as any;
      const stable = dev.parseLine('S S    12.345 g');
      expect(stable).toEqual({ weightGrams: 12.345, isStable: true, unit: 'g' });

      const unstable = dev.parseLine('S D    0.000 g');
      expect(unstable).toEqual({ weightGrams: 0, isStable: false, unit: 'g' });
    });

    it('parses A&D FG/FX stable (ST) and unstable (US) lines', () => {
      const dev = make('AND') as any;
      const stable = dev.parseLine('ST,+00005.50 g');
      expect(stable).toEqual({ weightGrams: 5.5, isStable: true, unit: 'g' });

      const unstable = dev.parseLine('US,+00000.12 g');
      expect(unstable).toEqual({ weightGrams: 0.12, isStable: false, unit: 'g' });
    });

    it('parses generic RS-232 ASCII with different units', () => {
      const dev = make('GENERIC') as any;
      const grams = dev.parseLine('5.50 g');
      expect(grams?.weightGrams).toBe(5.5);

      const kg = dev.parseLine('1.2 kg');
      expect(kg?.weightGrams).toBeCloseTo(1200);

      const carats = dev.parseLine('10 ct');
      expect(carats?.weightGrams).toBeCloseTo(2);
    });

    it('parses continuous weight-stream protocol', () => {
      const dev = make('CONTINUOUS') as any;
      const r = dev.parseLine('SWA5000');
      expect(r).toEqual({ weightGrams: 5, isStable: true, unit: 'g' });
    });

    it('returns null for malformed lines', () => {
      const dev = make('METTLER_SICS') as any;
      expect(dev.parseLine('garbage')).toBeNull();
      expect(dev.parseLine('')).toBeNull();
    });
  });
});
