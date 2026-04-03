// ─── Hardware Device Management Service ───────────────────────
// Register, configure, and manage hardware devices.
// Device configs stored in the platform Settings table (category: 'hardware').

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  CreateDeviceConfig,
  UpdateDeviceConfig,
  DeviceConfigResponse,
  DeviceListInput,
  DeviceStatus,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

/** Setting key prefix for hardware devices */
const DEVICE_SETTING_CATEGORY = 'hardware';
const DEVICE_KEY_PREFIX = 'device:';

@Injectable()
export class HardwareDeviceService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Register a new hardware device by persisting its config to the Settings table.
   */
  async registerDevice(
    tenantId: string,
    userId: string,
    input: CreateDeviceConfig,
  ): Promise<DeviceConfigResponse> {
    const deviceId = uuid();
    const now = new Date();

    const config: DeviceConfigResponse = {
      id: deviceId,
      tenantId,
      name: input.name,
      deviceType: input.deviceType,
      connectionType: input.connectionType,
      port: input.port,
      baudRate: input.baudRate,
      ipAddress: input.ipAddress,
      tcpPort: input.tcpPort,
      vendorId: input.vendorId,
      productId: input.productId,
      settings: input.settings ?? {},
      isActive: input.isActive ?? true,
      locationId: input.locationId,
      status: undefined,
      lastSeenAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.prisma.setting.create({
      data: {
        id: uuid(),
        tenantId,
        category: DEVICE_SETTING_CATEGORY,
        key: `${DEVICE_KEY_PREFIX}${deviceId}`,
        value: JSON.stringify(config),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return config;
  }

  /**
   * List all devices for a tenant, optionally filtered by location or type.
   */
  async listDevices(
    tenantId: string,
    input: DeviceListInput,
  ): Promise<PaginatedResult<DeviceConfigResponse>> {
    const { page, limit, locationId, deviceType, isActive } = input;

    const settings = await this.prisma.setting.findMany({
      where: {
        tenantId,
        category: DEVICE_SETTING_CATEGORY,
        key: { startsWith: DEVICE_KEY_PREFIX },
      },
      orderBy: { updatedAt: 'desc' },
    });

    let devices = settings.map((s) => JSON.parse(s.value as string) as DeviceConfigResponse);

    // Apply filters
    if (locationId) {
      devices = devices.filter((d) => d.locationId === locationId);
    }
    if (deviceType) {
      devices = devices.filter((d) => d.deviceType === deviceType);
    }
    if (isActive !== undefined) {
      devices = devices.filter((d) => d.isActive === isActive);
    }

    const total = devices.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const items = devices.slice(skip, skip + limit);

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

  /**
   * Get a single device by ID.
   */
  async getDevice(tenantId: string, deviceId: string): Promise<DeviceConfigResponse> {
    const setting = await this.prisma.setting.findFirst({
      where: {
        tenantId,
        category: DEVICE_SETTING_CATEGORY,
        key: `${DEVICE_KEY_PREFIX}${deviceId}`,
      },
    });

    if (!setting) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return JSON.parse(setting.value as string) as DeviceConfigResponse;
  }

  /**
   * Update device configuration.
   */
  async updateDevice(
    tenantId: string,
    userId: string,
    deviceId: string,
    input: UpdateDeviceConfig,
  ): Promise<DeviceConfigResponse> {
    const existing = await this.getDevice(tenantId, deviceId);

    const updated: DeviceConfigResponse = {
      ...existing,
      ...input,
      id: deviceId,
      tenantId,
      updatedAt: new Date(),
    };

    await this.prisma.setting.updateMany({
      where: {
        tenantId,
        category: DEVICE_SETTING_CATEGORY,
        key: `${DEVICE_KEY_PREFIX}${deviceId}`,
      },
      data: {
        value: JSON.stringify(updated),
        updatedBy: userId,
      },
    });

    return updated;
  }

  /**
   * Remove a device.
   */
  async removeDevice(tenantId: string, deviceId: string): Promise<void> {
    const setting = await this.prisma.setting.findFirst({
      where: {
        tenantId,
        category: DEVICE_SETTING_CATEGORY,
        key: `${DEVICE_KEY_PREFIX}${deviceId}`,
      },
    });

    if (!setting) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    await this.prisma.setting.delete({
      where: { id: setting.id },
    });
  }

  /**
   * Get device status. In a real deployment, this would ping the device
   * or check last heartbeat. For now, returns stored status or DISCONNECTED.
   */
  async getDeviceStatus(tenantId: string, deviceId: string): Promise<{ deviceId: string; status: DeviceStatus }> {
    const device = await this.getDevice(tenantId, deviceId);
    return {
      deviceId,
      status: (device.status as DeviceStatus) ?? 'DISCONNECTED',
    };
  }

  /**
   * Update device status (called internally by gateway or health checks).
   */
  async updateDeviceStatus(
    tenantId: string,
    deviceId: string,
    status: DeviceStatus,
  ): Promise<void> {
    const existing = await this.getDevice(tenantId, deviceId);

    const updated: DeviceConfigResponse = {
      ...existing,
      status,
      lastSeenAt: status === 'CONNECTED' ? new Date() : existing.lastSeenAt,
      updatedAt: new Date(),
    };

    await this.prisma.setting.updateMany({
      where: {
        tenantId,
        category: DEVICE_SETTING_CATEGORY,
        key: `${DEVICE_KEY_PREFIX}${deviceId}`,
      },
      data: {
        value: JSON.stringify(updated),
      },
    });
  }
}
