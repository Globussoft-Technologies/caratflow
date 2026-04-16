// ─── Hardware RFID Service ─────────────────────────────────────
// RFID tag processing, stock take, anti-theft, and tag encoding.
//
// Drivers:
//   - SimulatedRfidReader:     returns real tagged SerialNumber rows from
//                              Prisma for local dev / demo / CI.
//   - ImpinjRfidReader:        functional MVP driver for Impinj Speedway /
//                              R700. Attempts a JSON fetch against
//                              RFID_IMPINJ_HOST (Impinj IoT REST), and
//                              falls back to the simulation path (same
//                              3-6 tag pattern as SimulatedRfidReader,
//                              with a longer 250-500ms delay) when the
//                              endpoint is unavailable. Real LLRP / IoT
//                              REST integration remains a documented TODO.
//   - ZebraRfidReader:         functional MVP driver for Zebra FX series /
//                              ATR-7000. Attempts a JSON fetch against
//                              RFID_ZEBRA_HOST (Zebra IoT Connector), and
//                              falls back to simulation (300-500ms delay,
//                              distinct from Impinj). Real IoT Connector
//                              integration remains a documented TODO.
//
// The driver selection is controlled by `RFID_DRIVER=simulated|impinj|zebra`
// (defaults to `simulated`). Host configuration:
//   - RFID_IMPINJ_HOST / RFID_IMPINJ_PORT  (default 127.0.0.1:5084)
//   - RFID_ZEBRA_HOST  / RFID_ZEBRA_PORT   (default 127.0.0.1:443)

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  RfidTagData,
  RfidScanResult,
  RfidTagLookupResponse,
  RfidStockTakeInput,
  RfidStockTakeResult,
  RfidAntiTheftCheck,
  RfidAntiTheftResult,
  RfidWriteRequest,
  IDevice,
  DeviceType,
  DeviceStatus,
  DeviceStatusInfo,
} from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

// ─── Driver-Level Read Result ──────────────────────────────────
// The task contract: a read() returns enriched rows with the
// serial's product metadata so the caller can display them
// without another round-trip.

export interface RfidReadResultItem {
  tagId: string;
  productId: string;
  sku: string;
  name: string;
  readTimestamp: string;
}

export type RfidDriverName = 'simulated' | 'impinj' | 'zebra';

// ─── Shared hooks / callbacks ──────────────────────────────────

export interface RfidDriverDeps {
  prisma: PrismaService;
  eventBus: EventBusService;
  onTagsRead: (
    tenantId: string,
    deviceId: string,
    tags: RfidReadResultItem[],
  ) => Promise<void> | void;
}

// ─── Simulated Driver ──────────────────────────────────────────

/**
 * SimulatedRfidReader -- functional MVP driver backed by Prisma.
 *
 * On each `read()` it:
 *   1. Picks a tenant (provided via ctor or setTenant()).
 *   2. Queries up to a configurable window of SerialNumber rows
 *      that have a non-null `rfidTag` for that tenant.
 *   3. Randomly samples 3-6 of those rows.
 *   4. Sleeps 100-400ms to mimic reader latency.
 *   5. Emits `hardware.rfid.scanned` per tag via EventBus.
 *   6. Returns the enriched rows.
 */
export class SimulatedRfidReader implements IDevice<RfidReadResultItem[], string> {
  readonly deviceType: DeviceType = 'RFID_READER' as DeviceType;
  private connected = false;
  private tenantId: string | null;
  private readonly logger = new Logger(SimulatedRfidReader.name);

  constructor(
    public readonly deviceId: string,
    private readonly deps: RfidDriverDeps,
    tenantId: string | null = null,
  ) {
    this.tenantId = tenantId;
  }

  setTenant(tenantId: string): void {
    this.tenantId = tenantId;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async read(): Promise<RfidReadResultItem[] | null> {
    if (!this.tenantId) {
      this.logger.warn(
        `SimulatedRfidReader ${this.deviceId} read() called without tenant context`,
      );
      return [];
    }

    // Simulate reader latency
    const delayMs = 100 + Math.floor(Math.random() * 300); // 100-400ms
    await new Promise((r) => setTimeout(r, delayMs));

    // Pull a pool of tagged serials for the tenant
    const pool = await this.deps.prisma.serialNumber.findMany({
      where: {
        tenantId: this.tenantId,
        rfidTag: { not: null },
      },
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
      },
      take: 50,
    });

    if (pool.length === 0) {
      await this.deps.onTagsRead(this.tenantId, this.deviceId, []);
      return [];
    }

    // Sample 3-6 random rows (clamped to the pool size)
    const desired = 3 + Math.floor(Math.random() * 4); // 3-6
    const sampleSize = Math.min(desired, pool.length);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, sampleSize);

    const now = new Date().toISOString();
    const tags: RfidReadResultItem[] = picked.map((row) => ({
      tagId: row.rfidTag as string,
      productId: row.product.id,
      sku: row.product.sku,
      name: row.product.name,
      readTimestamp: now,
    }));

    // Emit one event per tag
    for (const tag of tags) {
      await this.deps.eventBus.publish({
        id: uuid(),
        type: 'hardware.rfid.scanned',
        tenantId: this.tenantId,
        userId: 'system',
        timestamp: now,
        payload: {
          deviceId: this.deviceId,
          epc: tag.tagId,
          serialNumberId:
            picked.find((p) => p.rfidTag === tag.tagId)?.id ?? null,
        },
      });
    }

    await this.deps.onTagsRead(this.tenantId, this.deviceId, tags);

    return tags;
  }

  async write(_payload: string): Promise<void> {
    // The simulator does not physically write EPC codes; tag
    // encoding happens through HardwareRfidService.writeTag().
  }

  async status(): Promise<DeviceStatusInfo> {
    return {
      deviceId: this.deviceId,
      status: (this.connected ? 'CONNECTED' : 'DISCONNECTED') as DeviceStatus,
      message: 'simulated-rfid',
    };
  }
}

// ─── Real-Hardware Driver Placeholders ─────────────────────────
//
// These classes implement IDevice so the service can register
// them uniformly, but their read() immediately fails in this
// codebase because we have no physical reader on the network.
// The intent is to document the expected wire protocol and
// provide a single place to slot in a real implementation later.

/**
 * ImpinjRfidReader -- functional MVP driver for Impinj Speedway
 * and R700 readers with simulation fallback.
 *
 * TODO: Real Impinj LLRP integration. A production implementation
 * would open an LLRP session to the reader on TCP/5084 or use the
 * Impinj IoT REST Interface (HTTPS) exposed by the R700 platform,
 * subscribing to tag events and enriching EPCs via
 * `serialNumber.findFirst({ where: { rfidTag }})` before calling
 * `onTagsRead`.
 *
 * Current behaviour:
 *   - If `RFID_IMPINJ_HOST` is set, attempts a JSON GET against
 *     `http://<host>:<port>/api/v1/tags` to fetch the live tag list
 *     (the Impinj IoT REST endpoint shape). Any failure logs and
 *     falls back to simulation.
 *   - Otherwise pulls 3-6 random tagged SerialNumber rows from
 *     Prisma (same pattern as SimulatedRfidReader), sleeps 250-500ms
 *     (longer than simulated to feel driver-specific), and emits
 *     `hardware.rfid.scanned` per tag.
 */
export class ImpinjRfidReader implements IDevice<RfidReadResultItem[], string> {
  readonly deviceType: DeviceType = 'RFID_READER' as DeviceType;
  private connected = false;
  private tenantId: string | null;
  private warnedFallbackOnce = false;
  private readonly logger = new Logger(ImpinjRfidReader.name);

  constructor(
    public readonly deviceId: string,
    private readonly host: string,
    private readonly port: number,
    private readonly deps: RfidDriverDeps,
    tenantId: string | null = null,
  ) {
    this.tenantId = tenantId;
    // Announce once at construction that we are in fallback mode.
    this.logger.warn(
      `ImpinjRfidReader ${this.deviceId}: Real Impinj LLRP integration TODO; running in simulation fallback`,
    );
  }

  setTenant(tenantId: string): void {
    this.tenantId = tenantId;
  }

  async connect(): Promise<void> {
    if (!this.warnedFallbackOnce) {
      this.logger.log(
        `ImpinjRfidReader ${this.deviceId} connect() (simulation fallback, host=${this.host}:${this.port})`,
      );
      this.warnedFallbackOnce = true;
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async read(): Promise<RfidReadResultItem[] | null> {
    if (!this.tenantId) {
      this.logger.warn(
        `ImpinjRfidReader ${this.deviceId} read() called without tenant context`,
      );
      return [];
    }

    // Longer reader latency (250-500ms) so users can distinguish
    // the driver from the SimulatedRfidReader's 100-400ms window.
    const delayMs = 250 + Math.floor(Math.random() * 250);
    await new Promise((r) => setTimeout(r, delayMs));

    // 1) Try the configured JSON endpoint if RFID_IMPINJ_HOST is set.
    const hostEnv = process.env.RFID_IMPINJ_HOST;
    let remoteTagIds: string[] | null = null;
    if (hostEnv) {
      try {
        const url = `http://${this.host}:${this.port}/api/v1/tags`;
        const res = await fetch(url, { method: 'GET' } as RequestInit);
        if (res.ok) {
          const body = (await res.json()) as unknown;
          remoteTagIds = this.extractTagIds(body);
        } else {
          this.logger.warn(
            `ImpinjRfidReader ${this.deviceId}: endpoint ${url} returned ${res.status}; falling back to simulation`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `ImpinjRfidReader ${this.deviceId}: endpoint fetch failed (${(err as Error).message}); falling back to simulation`,
        );
      }
    }

    // 2) Sample 3-6 random tagged SerialNumber rows from Prisma.
    const pool = await this.deps.prisma.serialNumber.findMany({
      where: {
        tenantId: this.tenantId,
        rfidTag: { not: null },
      },
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
      },
      take: 50,
    });

    if (pool.length === 0) {
      this.logger.log(
        `ImpinjRfidReader ${this.deviceId}: [0 tags read via simulation] (no tagged serials)`,
      );
      await this.deps.onTagsRead(this.tenantId, this.deviceId, []);
      return [];
    }

    // If the remote endpoint returned live IDs, filter the Prisma pool to
    // only those EPCs that appear in the remote list (best-effort join).
    let candidates = pool;
    if (remoteTagIds && remoteTagIds.length > 0) {
      const remoteSet = new Set(remoteTagIds);
      const matched = pool.filter((p) => p.rfidTag && remoteSet.has(p.rfidTag));
      if (matched.length > 0) {
        candidates = matched;
      }
    }

    const desired = 3 + Math.floor(Math.random() * 4); // 3-6
    const sampleSize = Math.min(desired, candidates.length);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, sampleSize);

    const now = new Date().toISOString();
    const tags: RfidReadResultItem[] = picked.map((row) => ({
      tagId: row.rfidTag as string,
      productId: row.product.id,
      sku: row.product.sku,
      name: row.product.name,
      readTimestamp: now,
    }));

    this.logger.log(
      `ImpinjRfidReader ${this.deviceId}: [${tags.length} tags read via simulation]`,
    );

    for (const tag of tags) {
      await this.deps.eventBus.publish({
        id: uuid(),
        type: 'hardware.rfid.scanned',
        tenantId: this.tenantId,
        userId: 'system',
        timestamp: now,
        payload: {
          deviceId: this.deviceId,
          epc: tag.tagId,
          serialNumberId:
            picked.find((p) => p.rfidTag === tag.tagId)?.id ?? null,
        },
      });
    }

    await this.deps.onTagsRead(this.tenantId, this.deviceId, tags);

    return tags;
  }

  async write(_payload: string): Promise<void> {
    // TODO: LLRP `ACCESS_SPEC` write operation goes here.
  }

  async status(): Promise<DeviceStatusInfo> {
    return {
      deviceId: this.deviceId,
      status: (this.connected ? 'CONNECTED' : 'DISCONNECTED') as DeviceStatus,
      message: `impinj ${this.host}:${this.port} (simulation fallback)`,
    };
  }

  private extractTagIds(body: unknown): string[] {
    // Accept a handful of shapes so different mock servers work:
    //   ["EPC-1", "EPC-2"]
    //   { tags: ["EPC-1"] }
    //   { tags: [{ epc: "EPC-1" }, { tagId: "EPC-2" }] }
    if (Array.isArray(body)) {
      return body.filter((x): x is string => typeof x === 'string');
    }
    if (body && typeof body === 'object' && 'tags' in body) {
      const tags = (body as { tags: unknown }).tags;
      if (Array.isArray(tags)) {
        return tags
          .map((t) => {
            if (typeof t === 'string') return t;
            if (t && typeof t === 'object') {
              const o = t as Record<string, unknown>;
              if (typeof o.epc === 'string') return o.epc;
              if (typeof o.tagId === 'string') return o.tagId;
            }
            return null;
          })
          .filter((s): s is string => typeof s === 'string');
      }
    }
    return [];
  }
}

/**
 * ZebraRfidReader -- functional MVP driver for Zebra FX series and
 * ATR-7000 overhead readers with simulation fallback.
 *
 * TODO: Real Zebra IoT Connector integration. A production
 * implementation would authenticate via `/cloud/localRestLogin` and
 * stream tag events over HTTP long-polling / websocket from the
 * Zebra IoT Connector, enriching EPCs via Prisma before delivering
 * them through `onTagsRead`.
 *
 * Current behaviour:
 *   - If `RFID_ZEBRA_HOST` is set, attempts a JSON GET against
 *     `http://<host>:<port>/cloud/tags` to fetch the live tag list
 *     (typical Zebra IoT Connector path). Any failure logs and
 *     falls back to simulation.
 *   - Otherwise pulls 3-6 random tagged SerialNumber rows from
 *     Prisma (same pattern as SimulatedRfidReader), sleeps 300-500ms
 *     (longer than simulated and distinct from Impinj), and emits
 *     `hardware.rfid.scanned` per tag.
 */
export class ZebraRfidReader implements IDevice<RfidReadResultItem[], string> {
  readonly deviceType: DeviceType = 'RFID_READER' as DeviceType;
  private connected = false;
  private tenantId: string | null;
  private warnedFallbackOnce = false;
  private readonly logger = new Logger(ZebraRfidReader.name);

  constructor(
    public readonly deviceId: string,
    private readonly host: string,
    private readonly port: number,
    private readonly deps: RfidDriverDeps,
    tenantId: string | null = null,
  ) {
    this.tenantId = tenantId;
    this.logger.warn(
      `ZebraRfidReader ${this.deviceId}: Real Zebra IoT Connector integration TODO; running in simulation fallback`,
    );
  }

  setTenant(tenantId: string): void {
    this.tenantId = tenantId;
  }

  async connect(): Promise<void> {
    if (!this.warnedFallbackOnce) {
      this.logger.log(
        `ZebraRfidReader ${this.deviceId} connect() (simulation fallback, host=${this.host}:${this.port})`,
      );
      this.warnedFallbackOnce = true;
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async read(): Promise<RfidReadResultItem[] | null> {
    if (!this.tenantId) {
      this.logger.warn(
        `ZebraRfidReader ${this.deviceId} read() called without tenant context`,
      );
      return [];
    }

    // Distinct reader latency (300-500ms): feels slower than Impinj.
    const delayMs = 300 + Math.floor(Math.random() * 200);
    await new Promise((r) => setTimeout(r, delayMs));

    const hostEnv = process.env.RFID_ZEBRA_HOST;
    let remoteTagIds: string[] | null = null;
    if (hostEnv) {
      try {
        const url = `http://${this.host}:${this.port}/cloud/tags`;
        const res = await fetch(url, { method: 'GET' } as RequestInit);
        if (res.ok) {
          const body = (await res.json()) as unknown;
          remoteTagIds = this.extractTagIds(body);
        } else {
          this.logger.warn(
            `ZebraRfidReader ${this.deviceId}: endpoint ${url} returned ${res.status}; falling back to simulation`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `ZebraRfidReader ${this.deviceId}: endpoint fetch failed (${(err as Error).message}); falling back to simulation`,
        );
      }
    }

    const pool = await this.deps.prisma.serialNumber.findMany({
      where: {
        tenantId: this.tenantId,
        rfidTag: { not: null },
      },
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
      },
      take: 50,
    });

    if (pool.length === 0) {
      this.logger.log(
        `ZebraRfidReader ${this.deviceId}: [0 tags read via simulation] (no tagged serials)`,
      );
      await this.deps.onTagsRead(this.tenantId, this.deviceId, []);
      return [];
    }

    let candidates = pool;
    if (remoteTagIds && remoteTagIds.length > 0) {
      const remoteSet = new Set(remoteTagIds);
      const matched = pool.filter((p) => p.rfidTag && remoteSet.has(p.rfidTag));
      if (matched.length > 0) {
        candidates = matched;
      }
    }

    const desired = 3 + Math.floor(Math.random() * 4); // 3-6
    const sampleSize = Math.min(desired, candidates.length);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, sampleSize);

    const now = new Date().toISOString();
    const tags: RfidReadResultItem[] = picked.map((row) => ({
      tagId: row.rfidTag as string,
      productId: row.product.id,
      sku: row.product.sku,
      name: row.product.name,
      readTimestamp: now,
    }));

    this.logger.log(
      `ZebraRfidReader ${this.deviceId}: [${tags.length} tags read via simulation]`,
    );

    for (const tag of tags) {
      await this.deps.eventBus.publish({
        id: uuid(),
        type: 'hardware.rfid.scanned',
        tenantId: this.tenantId,
        userId: 'system',
        timestamp: now,
        payload: {
          deviceId: this.deviceId,
          epc: tag.tagId,
          serialNumberId:
            picked.find((p) => p.rfidTag === tag.tagId)?.id ?? null,
        },
      });
    }

    await this.deps.onTagsRead(this.tenantId, this.deviceId, tags);

    return tags;
  }

  async write(_payload: string): Promise<void> {
    // TODO: Zebra IoT Connector write command goes here.
  }

  async status(): Promise<DeviceStatusInfo> {
    return {
      deviceId: this.deviceId,
      status: (this.connected ? 'CONNECTED' : 'DISCONNECTED') as DeviceStatus,
      message: `zebra ${this.host}:${this.port} (simulation fallback)`,
    };
  }

  private extractTagIds(body: unknown): string[] {
    if (Array.isArray(body)) {
      return body.filter((x): x is string => typeof x === 'string');
    }
    if (body && typeof body === 'object' && 'tags' in body) {
      const tags = (body as { tags: unknown }).tags;
      if (Array.isArray(tags)) {
        return tags
          .map((t) => {
            if (typeof t === 'string') return t;
            if (t && typeof t === 'object') {
              const o = t as Record<string, unknown>;
              if (typeof o.epc === 'string') return o.epc;
              if (typeof o.tagId === 'string') return o.tagId;
            }
            return null;
          })
          .filter((s): s is string => typeof s === 'string');
      }
    }
    return [];
  }
}

// ─── Legacy alias ──────────────────────────────────────────────
// Kept so any external references continue to compile. New code
// should reach for `SimulatedRfidReader` instead.
export class RfidReaderStubDevice implements IDevice<RfidTagData[], string> {
  readonly deviceType: DeviceType = 'RFID_READER' as DeviceType;
  private connected = false;

  constructor(
    public readonly deviceId: string,
    private readonly host: string,
    private readonly port: number,
    private readonly onTags: (tags: RfidTagData[]) => void,
  ) {}

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async read(): Promise<RfidTagData[] | null> {
    return [];
  }

  async write(_payload: string): Promise<void> {
    // no-op
  }

  async status(): Promise<DeviceStatusInfo> {
    return {
      deviceId: this.deviceId,
      status: (this.connected ? 'CONNECTED' : 'DISCONNECTED') as DeviceStatus,
      message: `${this.host}:${this.port}`,
    };
  }

  pushTags(tags: RfidTagData[]): void {
    this.onTags(tags);
  }
}

// ─── Service ───────────────────────────────────────────────────

@Injectable()
export class HardwareRfidService extends TenantAwareService {
  private readonly logger = new Logger(HardwareRfidService.name);
  private readonly drivers = new Map<string, IDevice<RfidReadResultItem[], string>>();
  private readonly driverName: RfidDriverName;

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
    this.driverName = this.resolveDriverName();
  }

  private resolveDriverName(): RfidDriverName {
    const envRaw = (process.env.RFID_DRIVER ?? 'simulated').toLowerCase();
    if (envRaw === 'impinj' || envRaw === 'zebra' || envRaw === 'simulated') {
      return envRaw;
    }
    return 'simulated';
  }

  /** For tests / admins wanting to inspect which driver is wired up. */
  getDriverName(): RfidDriverName {
    return this.driverName;
  }

  private buildDriverDeps(): RfidDriverDeps {
    return {
      prisma: this.prisma,
      eventBus: this.eventBus,
      onTagsRead: async (_tenantId, _deviceId, _tags) => {
        // Central hook -- currently the driver itself publishes per-tag
        // events; this callback exists so the WebSocket/SSE gateway can
        // relay tag streams to the POS UI later without touching driver code.
      },
    };
  }

  private createDriver(
    deviceId: string,
    tenantId: string,
  ): IDevice<RfidReadResultItem[], string> {
    const deps = this.buildDriverDeps();
    switch (this.driverName) {
      case 'impinj':
        return new ImpinjRfidReader(
          deviceId,
          process.env.RFID_IMPINJ_HOST ?? '127.0.0.1',
          Number(process.env.RFID_IMPINJ_PORT ?? 5084),
          deps,
          tenantId,
        );
      case 'zebra':
        return new ZebraRfidReader(
          deviceId,
          process.env.RFID_ZEBRA_HOST ?? '127.0.0.1',
          Number(process.env.RFID_ZEBRA_PORT ?? 443),
          deps,
          tenantId,
        );
      case 'simulated':
      default:
        return new SimulatedRfidReader(deviceId, deps, tenantId);
    }
  }

  /** Get or lazily create a driver for the given tenant + reader. */
  private getDriver(
    tenantId: string,
    deviceId?: string,
  ): IDevice<RfidReadResultItem[], string> {
    const id = deviceId ?? `rfid-${tenantId}-default`;
    const key = `${tenantId}:${id}`;

    const existing = this.drivers.get(key);
    if (existing) {
      if (
        existing instanceof SimulatedRfidReader ||
        existing instanceof ImpinjRfidReader ||
        existing instanceof ZebraRfidReader
      ) {
        existing.setTenant(tenantId);
      }
      return existing;
    }

    const driver = this.createDriver(id, tenantId);
    this.drivers.set(key, driver);
    return driver;
  }

  /**
   * Trigger an RFID read from the configured driver for this tenant.
   * Returns the enriched tag list (tagId/productId/sku/name/readTimestamp).
   */
  async readTags(
    tenantId: string,
    readerId?: string,
  ): Promise<RfidReadResultItem[]> {
    const driver = this.getDriver(tenantId, readerId);

    // Connect lazily -- idempotent on all drivers.
    await driver.connect();

    try {
      const tags = await driver.read();
      return tags ?? [];
    } catch (err) {
      this.logger.error(
        `RFID read failed on driver ${this.driverName} for tenant ${tenantId}`,
        err as Error,
      );
      throw err;
    }
  }

  /**
   * Process an RFID scan event: look up tag in SerialNumber table, return product info.
   */
  async processScans(tenantId: string, input: RfidScanResult): Promise<RfidTagLookupResponse[]> {
    const results: RfidTagLookupResponse[] = [];

    for (const tag of input.tags) {
      const result = await this.lookupTag(tenantId, tag.epc);
      results.push(result);
    }

    return results;
  }

  /**
   * Look up a single RFID tag by EPC code.
   */
  async lookupTag(tenantId: string, epc: string): Promise<RfidTagLookupResponse> {
    const serial = await this.prisma.serialNumber.findFirst({
      where: {
        tenantId,
        rfidTag: epc,
      },
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    if (!serial) {
      return {
        tagId: epc,
        epc,
        serialNumber: null,
        productId: null,
        productName: null,
        productSku: null,
        locationId: null,
        status: null,
      };
    }

    const result: RfidTagLookupResponse = {
      tagId: epc,
      epc,
      serialNumber: serial.serialNumber,
      productId: serial.product.id,
      productName: serial.product.name,
      productSku: serial.product.sku,
      locationId: serial.location?.id ?? null,
      status: serial.status,
    };

    await this.eventBus.publish({
      id: uuid(),
      type: 'hardware.rfid.scanned',
      tenantId,
      userId: 'system',
      timestamp: new Date().toISOString(),
      payload: { deviceId: 'rfid-reader', epc, serialNumberId: serial.id },
    });

    return result;
  }

  /**
   * RFID-based stock take: scan all tags at a location, compare with system stock.
   * Returns matched, unmatched (scanned but not in system), and missing (in system but not scanned).
   */
  async stockTake(tenantId: string, input: RfidStockTakeInput): Promise<RfidStockTakeResult> {
    const { locationId, scannedTags } = input;

    // Get all serial numbers with RFID tags at the given location
    const expectedSerials = await this.prisma.serialNumber.findMany({
      where: {
        tenantId,
        locationId,
        rfidTag: { not: null },
        status: { in: ['AVAILABLE', 'RESERVED'] },
      },
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
      },
    });

    // Build lookup maps
    const scannedEpcs = new Set(scannedTags.map((t) => t.epc));
    const expectedByRfid = new Map(
      expectedSerials.map((s) => [s.rfidTag!, s]),
    );

    const matched: RfidStockTakeResult['matched'] = [];
    const unmatched: RfidStockTakeResult['unmatched'] = [];
    const missing: RfidStockTakeResult['missing'] = [];

    // Process scanned tags
    for (const tag of scannedTags) {
      const serial = expectedByRfid.get(tag.epc);
      if (serial) {
        matched.push({
          tagId: tag.tagId,
          epc: tag.epc,
          serialNumber: serial.serialNumber,
          productId: serial.product.id,
          productName: serial.product.name,
          productSku: serial.product.sku,
        });
      } else {
        unmatched.push({
          tagId: tag.tagId,
          epc: tag.epc,
        });
      }
    }

    // Find missing items (expected but not scanned)
    for (const serial of expectedSerials) {
      if (!scannedEpcs.has(serial.rfidTag!)) {
        missing.push({
          serialNumber: serial.serialNumber,
          productId: serial.product.id,
          productName: serial.product.name,
          productSku: serial.product.sku,
          rfidTag: serial.rfidTag!,
        });
      }
    }

    return {
      locationId,
      totalScanned: scannedTags.length,
      matched,
      unmatched,
      missing,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Write/encode RFID tag data. Associates an RFID tag with a serial number.
   */
  async writeTag(tenantId: string, userId: string, serialNumberId: string, input: RfidWriteRequest): Promise<void> {
    const serial = await this.prisma.serialNumber.findFirst({
      where: this.tenantWhere(tenantId, { id: serialNumberId }),
    });

    if (!serial) {
      throw new NotFoundException(`Serial number ${serialNumberId} not found`);
    }

    // Check if the RFID tag is already assigned to another serial
    const existingTag = await this.prisma.serialNumber.findFirst({
      where: {
        tenantId,
        rfidTag: input.data,
        id: { not: serialNumberId },
      },
    });

    if (existingTag) {
      throw new NotFoundException(
        `RFID tag ${input.data} is already assigned to serial number ${existingTag.serialNumber}`,
      );
    }

    await this.prisma.serialNumber.update({
      where: { id: serialNumberId },
      data: {
        rfidTag: input.data,
        updatedBy: userId,
      },
    });
  }

  /**
   * Anti-theft check: validate an RFID tag at an exit point.
   * Returns whether the tag is authorized to leave (e.g., status is SOLD).
   */
  async antiTheftCheck(tenantId: string, input: RfidAntiTheftCheck): Promise<RfidAntiTheftResult> {
    const serial = await this.prisma.serialNumber.findFirst({
      where: {
        tenantId,
        rfidTag: input.epc,
      },
      include: {
        product: { select: { name: true } },
      },
    });

    if (!serial) {
      return {
        tagId: input.tagId,
        isAuthorized: false,
        serialNumber: null,
        productName: null,
        reason: 'Unknown RFID tag - not registered in system',
      };
    }

    // Item is authorized to leave if it has been sold
    if (serial.status === 'SOLD') {
      return {
        tagId: input.tagId,
        isAuthorized: true,
        serialNumber: serial.serialNumber,
        productName: serial.product.name,
        reason: 'Item has been sold',
      };
    }

    // Item is authorized if it is in transit (being transferred)
    if (serial.status === 'IN_TRANSIT') {
      return {
        tagId: input.tagId,
        isAuthorized: true,
        serialNumber: serial.serialNumber,
        productName: serial.product.name,
        reason: 'Item is in authorized transit',
      };
    }

    // Otherwise, flag as unauthorized
    return {
      tagId: input.tagId,
      isAuthorized: false,
      serialNumber: serial.serialNumber,
      productName: serial.product.name,
      reason: `Item status is ${serial.status} - not authorized to leave premises`,
    };
  }
}
