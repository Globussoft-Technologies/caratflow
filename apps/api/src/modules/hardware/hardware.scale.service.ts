// ─── Hardware Weighing Scale Service ──────────────────────────
// Real serial-port driver for jewelry weighing scales plus
// pricing / tolerance utilities. Supports several common scale
// protocols (continuous weight stream, A&D FG/FX, Mettler Toledo
// SICS, generic RS-232 ASCII). The actual `serialport` package
// is loaded dynamically so the API still type-checks and runs in
// environments where the native module is not installed; in that
// case the scale falls back to the most recent reading pushed
// through `processReading()`.

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  WeightReading,
  WeightCaptureRequest,
  WeightCaptureResponse,
  WeightPricingRequest,
  WeightPricingResponse,
  WeightToleranceCheck,
  WeightToleranceResult,
  IDevice,
  DeviceStatus,
  DeviceType,
  DeviceStatusInfo,
  ScaleReadRequest,
} from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

/** Scale protocols we know how to parse */
export type ScaleProtocol = 'CONTINUOUS' | 'AND' | 'METTLER_SICS' | 'GENERIC';

interface ParsedScaleLine {
  weightGrams: number;
  isStable: boolean;
  unit: string;
}

/** In-memory tare weight storage per device (keyed by tenantId:deviceId) */
const tareWeights = new Map<string, number>();

/** In-memory last reading per device (keyed by tenantId:deviceId) */
const lastReadings = new Map<string, WeightReading>();

/** Active driver instances keyed by deviceId */
const drivers = new Map<string, ScaleSerialDevice>();

// ─── Driver ───────────────────────────────────────────────────

export class ScaleSerialDevice implements IDevice<WeightReading, string> {
  readonly deviceType: DeviceType = 'WEIGHING_SCALE' as DeviceType;
  private port: { write: (s: string) => void; close: (cb?: () => void) => void } | null = null;
  private latest: WeightReading | null = null;
  private connected = false;
  private readonly logger = new Logger(ScaleSerialDevice.name);

  constructor(
    public readonly deviceId: string,
    private readonly portPath: string,
    private readonly baudRate: number,
    private readonly protocol: ScaleProtocol,
    private readonly onReading: (r: WeightReading) => void,
  ) {}

  async connect(): Promise<void> {
    if (this.connected) return;

    let SerialPortMod: { SerialPort: new (opts: unknown) => unknown } | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      SerialPortMod = require('serialport') as {
        SerialPort: new (opts: unknown) => unknown;
      };
    } catch {
      this.logger.warn(
        `serialport package not installed; scale ${this.deviceId} running in soft mode`,
      );
      this.connected = true;
      return;
    }

    try {
      const sp = new SerialPortMod.SerialPort({
        path: this.portPath,
        baudRate: this.baudRate,
        autoOpen: true,
      }) as {
        on: (event: string, cb: (data: Buffer | Error) => void) => void;
        write: (s: string) => void;
        close: (cb?: () => void) => void;
      };

      let buffer = '';
      sp.on('data', (data) => {
        if (data instanceof Error) return;
        buffer += data.toString('ascii');
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const parsed = this.parseLine(line.trim());
          if (parsed) {
            const reading: WeightReading = {
              weightGrams: parsed.weightGrams,
              weightMg: Math.round(parsed.weightGrams * 1000),
              unit: parsed.unit,
              isStable: parsed.isStable,
              deviceId: this.deviceId,
              timestamp: new Date().toISOString(),
            };
            this.latest = reading;
            this.onReading(reading);
          }
        }
      });
      sp.on('error', (err) => {
        if (err instanceof Error) this.logger.error(`Scale ${this.deviceId} error: ${err.message}`);
      });

      this.port = sp;
      this.connected = true;
    } catch (err) {
      this.logger.error(`Failed to open serial port ${this.portPath}: ${(err as Error).message}`);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.port) {
      this.connected = false;
      return;
    }
    await new Promise<void>((resolve) => this.port?.close(() => resolve()));
    this.port = null;
    this.connected = false;
  }

  async read(): Promise<WeightReading | null> {
    if (this.port) {
      if (this.protocol === 'METTLER_SICS') this.port.write('S\r\n');
      else if (this.protocol === 'AND') this.port.write('Q\r\n');
    }

    const deadline = Date.now() + 500;
    while (Date.now() < deadline) {
      if (this.latest && Date.now() - new Date(this.latest.timestamp).getTime() < 1000) {
        return this.latest;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    return this.latest;
  }

  async write(payload: string): Promise<void> {
    this.port?.write(payload);
  }

  async status(): Promise<DeviceStatusInfo> {
    return {
      deviceId: this.deviceId,
      status: (this.connected ? 'CONNECTED' : 'DISCONNECTED') as DeviceStatus,
      lastSeenAt: this.latest?.timestamp,
    };
  }

  private parseLine(line: string): ParsedScaleLine | null {
    if (!line) return null;

    switch (this.protocol) {
      case 'METTLER_SICS': {
        const m = line.match(/^S\s+([SD])\s+(-?\d+\.?\d*)\s*([a-zA-Z]+)?/);
        if (!m) return null;
        return {
          weightGrams: parseFloat(m[2]!),
          isStable: m[1] === 'S',
          unit: m[3] ?? 'g',
        };
      }
      case 'AND': {
        const m = line.match(/^(ST|US|QT)\s*,\s*([+-]?\d+\.?\d*)\s*([a-zA-Z]+)?/);
        if (!m) return null;
        return {
          weightGrams: parseFloat(m[2]!),
          isStable: m[1] === 'ST' || m[1] === 'QT',
          unit: m[3] ?? 'g',
        };
      }
      case 'CONTINUOUS': {
        const m = line.match(/SW([A-Z])(-?\d+)/);
        if (!m) return null;
        const grams = parseInt(m[2]!, 10) / 1000;
        return { weightGrams: grams, isStable: m[1] === 'A', unit: 'g' };
      }
      case 'GENERIC':
      default: {
        const m = line.match(/(-?\d+\.?\d*)\s*(g|kg|ct|oz)?/i);
        if (!m) return null;
        let grams = parseFloat(m[1]!);
        const unit = (m[2] ?? 'g').toLowerCase();
        if (unit === 'kg') grams *= 1000;
        else if (unit === 'ct') grams *= 0.2;
        else if (unit === 'oz') grams *= 28.3495;
        return { weightGrams: grams, isStable: !/U|US|UN/.test(line), unit: 'g' };
      }
    }
  }
}

// ─── Service ──────────────────────────────────────────────────

@Injectable()
export class HardwareScaleService extends TenantAwareService {
  private readonly logger = new Logger(HardwareScaleService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /**
   * Open a serial driver for a registered scale device.
   */
  async openDevice(
    tenantId: string,
    deviceId: string,
    portPath: string,
    baudRate: number,
    protocol: ScaleProtocol,
  ): Promise<ScaleSerialDevice> {
    const existing = drivers.get(deviceId);
    if (existing) return existing;

    const driver = new ScaleSerialDevice(deviceId, portPath, baudRate, protocol, (r) => {
      void this.processReading(tenantId, r);
    });
    try {
      await driver.connect();
      drivers.set(deviceId, driver);
    } catch (err) {
      this.logger.warn(`Could not open scale ${deviceId}: ${(err as Error).message}`);
    }
    return driver;
  }

  /**
   * On-demand "send me the current weight" call used by REST.
   */
  async readNow(tenantId: string, input: ScaleReadRequest): Promise<WeightReading> {
    const driver = drivers.get(input.deviceId);
    if (driver) {
      const reading = await driver.read();
      if (reading) {
        await this.processReading(tenantId, reading);
        return reading;
      }
    }

    const last = lastReadings.get(`${tenantId}:${input.deviceId}`);
    if (!last) {
      throw new BadRequestException(
        'No weight reading available. Place an item on the scale or start the local serial agent.',
      );
    }
    return last;
  }

  /**
   * Process a weight reading from a scale device.
   * Converts to milligrams, stores the latest reading.
   */
  async processReading(tenantId: string, reading: WeightReading): Promise<WeightReading> {
    // Ensure weight in milligrams is consistent with grams
    const normalizedReading: WeightReading = {
      ...reading,
      weightMg:
        reading.weightMg > 0 ? reading.weightMg : Math.round(reading.weightGrams * 1000),
      weightGrams:
        reading.weightGrams > 0 ? reading.weightGrams : reading.weightMg / 1000,
    };

    const key = `${tenantId}:${reading.deviceId}`;
    lastReadings.set(key, normalizedReading);

    await this.eventBus.publish({
      id: uuid(),
      type: 'hardware.scale.read',
      tenantId,
      userId: 'system',
      timestamp: new Date().toISOString(),
      payload: {
        deviceId: reading.deviceId,
        weightMg: normalizedReading.weightMg,
        isStable: normalizedReading.isStable,
      },
    });

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
