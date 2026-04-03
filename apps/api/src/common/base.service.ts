import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Base service class providing tenant-aware operations.
 * All domain services should extend this.
 */
@Injectable()
export abstract class TenantAwareService {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Ensure a where clause includes tenantId filtering.
   * Always call this when building queries to prevent cross-tenant data access.
   */
  protected tenantWhere(tenantId: string, where: Record<string, unknown> = {}): Record<string, unknown> {
    return { ...where, tenantId };
  }
}
