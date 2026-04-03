import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type { AuditMeta } from '@caratflow/shared-types';

interface CreateBranchInput {
  name: string;
  locationType: 'SHOWROOM' | 'WAREHOUSE' | 'WORKSHOP' | 'OFFICE';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  settings?: BranchSettings;
}

interface UpdateBranchInput {
  name?: string;
  locationType?: 'SHOWROOM' | 'WAREHOUSE' | 'WORKSHOP' | 'OFFICE';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  settings?: BranchSettings;
}

interface BranchSettings {
  taxConfig?: {
    gstNumber?: string;
    stateCode?: string;
    defaultGstRate?: number;
  };
  workingHours?: {
    start: string; // HH:mm
    end: string;
    daysOff: number[]; // 0=Sunday, etc.
  };
  defaultRates?: {
    makingChargesPercent?: number;
    wastagePercent?: number;
  };
}

@Injectable()
export class PlatformBranchService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /** Create a new branch/location for the tenant. */
  async createBranch(tenantId: string, input: CreateBranchInput, audit: AuditMeta) {
    const branch = await this.prisma.location.create({
      data: {
        id: uuid(),
        tenantId,
        name: input.name,
        locationType: input.locationType,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        country: input.country ?? null,
        postalCode: input.postalCode ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        settings: (input.settings as Record<string, unknown>) ?? null,
        isActive: true,
        createdBy: audit.userId,
      },
    });

    await this.eventBus.publish({
      id: uuid(),
      tenantId,
      userId: audit.userId,
      timestamp: new Date().toISOString(),
      type: 'platform.branch.created',
      payload: { locationId: branch.id, name: branch.name, locationType: branch.locationType },
    });

    return branch;
  }

  /** Update an existing branch. */
  async updateBranch(tenantId: string, branchId: string, input: UpdateBranchInput, audit: AuditMeta) {
    await this.ensureBranchExists(tenantId, branchId);

    const data: Record<string, unknown> = { updatedBy: audit.userId };
    if (input.name !== undefined) data.name = input.name;
    if (input.locationType !== undefined) data.locationType = input.locationType;
    if (input.address !== undefined) data.address = input.address;
    if (input.city !== undefined) data.city = input.city;
    if (input.state !== undefined) data.state = input.state;
    if (input.country !== undefined) data.country = input.country;
    if (input.postalCode !== undefined) data.postalCode = input.postalCode;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.email !== undefined) data.email = input.email;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.settings !== undefined) data.settings = input.settings as Record<string, unknown>;

    return this.prisma.location.update({
      where: { id: branchId },
      data,
    });
  }

  /** Delete (deactivate) a branch. */
  async deactivateBranch(tenantId: string, branchId: string, audit: AuditMeta) {
    await this.ensureBranchExists(tenantId, branchId);
    return this.prisma.location.update({
      where: { id: branchId },
      data: { isActive: false, updatedBy: audit.userId },
    });
  }

  /** Get all branches for the current tenant. */
  async listBranches(tenantId: string, includeInactive = false) {
    const where: Record<string, unknown> = { tenantId };
    if (!includeInactive) {
      where.isActive = true;
    }
    return this.prisma.location.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /** Get a single branch by ID. */
  async getBranchById(tenantId: string, branchId: string) {
    const branch = await this.prisma.location.findFirst({
      where: this.tenantWhere(tenantId, { id: branchId }),
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }

  /** Update branch-level settings (tax config, working hours, rates). */
  async updateBranchSettings(tenantId: string, branchId: string, settings: BranchSettings, audit: AuditMeta) {
    const branch = await this.ensureBranchExists(tenantId, branchId);
    const currentSettings = (branch.settings as Record<string, unknown>) ?? {};
    const mergedSettings = { ...currentSettings, ...settings };

    return this.prisma.location.update({
      where: { id: branchId },
      data: { settings: mergedSettings, updatedBy: audit.userId },
    });
  }

  /** Set the active branch for a user (stored in user preferences). */
  async setUserActiveBranch(tenantId: string, userId: string, branchId: string) {
    // Verify branch belongs to tenant
    await this.ensureBranchExists(tenantId, branchId);

    const user = await this.prisma.user.findFirst({
      where: this.tenantWhere(tenantId, { id: userId }),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preferences = (user.preferences as Record<string, unknown>) ?? {};
    preferences.activeBranchId = branchId;

    return this.prisma.user.update({
      where: { id: userId },
      data: { preferences },
      select: { id: true, preferences: true },
    });
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async ensureBranchExists(tenantId: string, branchId: string) {
    const branch = await this.prisma.location.findFirst({
      where: this.tenantWhere(tenantId, { id: branchId }),
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }
}
