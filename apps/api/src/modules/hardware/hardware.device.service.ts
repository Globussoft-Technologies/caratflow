// ─── Hardware Device Management Service ───────────────────────
// Register, configure, and manage hardware devices.
// Devices are persisted in the dedicated `HardwareDevice` table
// in the platform schema.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  CreateDeviceConfig,
  UpdateDeviceConfig,
  DeviceConfigResponse,
  DeviceListInput,
  DeviceStatus,
  DeviceType,
  ConnectionType,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

type HardwareDeviceRow = {
  id: string;
  tenantId: string;
  locationId: string;
  name: string;
  deviceType: string;
  connectionType: string;
  port: string | null;
  baudRate: number | null;
  ipAddress: string | null;
  tcpPort: number | null;
  vendorId: string | null;
  productId: string | null;
  settings: unknown;
  status: string;
  isActive: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class HardwareDeviceService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  private toResponse(row: HardwareDeviceRow): DeviceConfigResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      deviceType: row.deviceType as DeviceType,
      connectionType: row.connectionType as ConnectionType,
      port: row.port ?? undefined,
      baudRate: row.baudRate ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
      tcpPort: row.tcpPort ?? undefined,
      vendorId: row.vendorId ?? undefined,
      productId: row.productId ?? undefined,
      settings: (row.settings as Record<string, unknown>) ?? {},
      isActive: row.isActive,
      locationId: row.locationId,
      status: row.status as DeviceStatus,
      lastSeenAt: row.lastSeenAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async registerDevice(
    tenantId: string,
    userId: string,
    input: CreateDeviceConfig,
  ): Promise<DeviceConfigResponse> {
    const created = (await this.prisma.hardwareDevice.create({
      data: {
        id: uuid(),
        tenantId,
        locationId: input.locationId,
        name: input.name,
        deviceType: input.deviceType as never,
        connectionType: input.connectionType as never,
        port: input.port ?? null,
        baudRate: input.baudRate ?? null,
        ipAddress: input.ipAddress ?? null,
        tcpPort: input.tcpPort ?? null,
        vendorId: input.vendorId ?? null,
        productId: input.productId ?? null,
        settings: (input.settings ?? {}) as object,
        isActive: input.isActive ?? true,
        status: 'DISCONNECTED' as never,
        createdBy: userId,
        updatedBy: userId,
      },
    })) as unknown as HardwareDeviceRow;

    return this.toResponse(created);
  }

  async listDevices(
    tenantId: string,
    input: DeviceListInput,
  ): Promise<PaginatedResult<DeviceConfigResponse>> {
    const { page, limit, locationId, deviceType, isActive } = input;

    const where: Record<string, unknown> = { tenantId };
    if (locationId) where.locationId = locationId;
    if (deviceType) where.deviceType = deviceType;
    if (isActive !== undefined) where.isActive = isActive;

    const [total, rows] = await Promise.all([
      this.prisma.hardwareDevice.count({ where: where as never }),
      this.prisma.hardwareDevice.findMany({
        where: where as never,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const items = (rows as unknown as HardwareDeviceRow[]).map((r) => this.toResponse(r));
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async getDevice(tenantId: string, deviceId: string): Promise<DeviceConfigResponse> {
    const row = await this.prisma.hardwareDevice.findFirst({
      where: { tenantId, id: deviceId },
    });
    if (!row) throw new NotFoundException(`Device ${deviceId} not found`);
    return this.toResponse(row as unknown as HardwareDeviceRow);
  }

  async updateDevice(
    tenantId: string,
    userId: string,
    deviceId: string,
    input: UpdateDeviceConfig,
  ): Promise<DeviceConfigResponse> {
    await this.getDevice(tenantId, deviceId);

    const data: Record<string, unknown> = { updatedBy: userId };
    if (input.name !== undefined) data.name = input.name;
    if (input.deviceType !== undefined) data.deviceType = input.deviceType;
    if (input.connectionType !== undefined) data.connectionType = input.connectionType;
    if (input.port !== undefined) data.port = input.port;
    if (input.baudRate !== undefined) data.baudRate = input.baudRate;
    if (input.ipAddress !== undefined) data.ipAddress = input.ipAddress;
    if (input.tcpPort !== undefined) data.tcpPort = input.tcpPort;
    if (input.vendorId !== undefined) data.vendorId = input.vendorId;
    if (input.productId !== undefined) data.productId = input.productId;
    if (input.settings !== undefined) data.settings = input.settings as object;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.locationId !== undefined) data.locationId = input.locationId;

    const updated = (await this.prisma.hardwareDevice.update({
      where: { id: deviceId },
      data: data as never,
    })) as unknown as HardwareDeviceRow;
    return this.toResponse(updated);
  }

  async removeDevice(tenantId: string, deviceId: string): Promise<void> {
    await this.getDevice(tenantId, deviceId);
    await this.prisma.hardwareDevice.delete({ where: { id: deviceId } });
  }

  async getDeviceStatus(
    tenantId: string,
    deviceId: string,
  ): Promise<{ deviceId: string; status: DeviceStatus }> {
    const device = await this.getDevice(tenantId, deviceId);
    return {
      deviceId,
      status: (device.status as DeviceStatus) ?? ('DISCONNECTED' as DeviceStatus),
    };
  }

  async updateDeviceStatus(
    tenantId: string,
    deviceId: string,
    status: DeviceStatus,
  ): Promise<void> {
    await this.getDevice(tenantId, deviceId);
    await this.prisma.hardwareDevice.update({
      where: { id: deviceId },
      data: {
        status: status as never,
        lastSeenAt: status === 'CONNECTED' ? new Date() : undefined,
      },
    });

    await this.eventBus.publish({
      id: uuid(),
      type: 'hardware.device.status_changed',
      tenantId,
      userId: 'system',
      timestamp: new Date().toISOString(),
      payload: { deviceId, status: String(status) },
    });
  }
}
