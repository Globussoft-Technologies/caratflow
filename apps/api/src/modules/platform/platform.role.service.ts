import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type { AuditMeta } from '@caratflow/shared-types';

interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: string[]; // Array of permission strings like "inventory.item.create"
}

interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

/** Comprehensive permission catalog covering ALL modules. */
const DEFAULT_PERMISSIONS: Array<{ module: string; resource: string; action: string; description: string }> = [
  // ─── Platform ─────────────────────────────────────────────
  { module: 'platform', resource: 'user', action: 'create', description: 'Create/invite users' },
  { module: 'platform', resource: 'user', action: 'read', description: 'View user profiles' },
  { module: 'platform', resource: 'user', action: 'update', description: 'Edit user profiles' },
  { module: 'platform', resource: 'user', action: 'delete', description: 'Deactivate users' },
  { module: 'platform', resource: 'role', action: 'create', description: 'Create roles' },
  { module: 'platform', resource: 'role', action: 'read', description: 'View roles' },
  { module: 'platform', resource: 'role', action: 'update', description: 'Edit roles and permissions' },
  { module: 'platform', resource: 'role', action: 'delete', description: 'Delete roles' },
  { module: 'platform', resource: 'branch', action: 'create', description: 'Create branches/locations' },
  { module: 'platform', resource: 'branch', action: 'read', description: 'View branches' },
  { module: 'platform', resource: 'branch', action: 'update', description: 'Edit branch settings' },
  { module: 'platform', resource: 'branch', action: 'delete', description: 'Deactivate branches' },
  { module: 'platform', resource: 'settings', action: 'read', description: 'View tenant settings' },
  { module: 'platform', resource: 'settings', action: 'update', description: 'Modify tenant settings' },
  { module: 'platform', resource: 'audit', action: 'read', description: 'View audit logs' },
  { module: 'platform', resource: 'import', action: 'create', description: 'Run data imports' },
  { module: 'platform', resource: 'export', action: 'create', description: 'Run data exports' },
  { module: 'platform', resource: 'notification', action: 'read', description: 'View notifications' },
  { module: 'platform', resource: 'i18n', action: 'read', description: 'View translations' },
  { module: 'platform', resource: 'i18n', action: 'update', description: 'Edit translations' },
  { module: 'platform', resource: 'file', action: 'create', description: 'Upload files' },
  { module: 'platform', resource: 'file', action: 'read', description: 'View/download files' },
  { module: 'platform', resource: 'file', action: 'delete', description: 'Delete files' },
  { module: 'platform', resource: 'backup', action: 'read', description: 'View backup schedules' },
  { module: 'platform', resource: 'backup', action: 'update', description: 'Manage backup schedules' },

  // ─── Inventory ────────────────────────────────────────────
  { module: 'inventory', resource: 'item', action: 'create', description: 'Add new inventory items' },
  { module: 'inventory', resource: 'item', action: 'read', description: 'View inventory items' },
  { module: 'inventory', resource: 'item', action: 'update', description: 'Edit inventory items' },
  { module: 'inventory', resource: 'item', action: 'delete', description: 'Remove inventory items' },
  { module: 'inventory', resource: 'stock', action: 'read', description: 'View stock levels' },
  { module: 'inventory', resource: 'stock', action: 'adjust', description: 'Adjust stock quantities' },
  { module: 'inventory', resource: 'transfer', action: 'create', description: 'Create stock transfers' },
  { module: 'inventory', resource: 'transfer', action: 'read', description: 'View stock transfers' },
  { module: 'inventory', resource: 'transfer', action: 'approve', description: 'Approve stock transfers' },
  { module: 'inventory', resource: 'stocktake', action: 'create', description: 'Start stock-takes' },
  { module: 'inventory', resource: 'stocktake', action: 'read', description: 'View stock-takes' },
  { module: 'inventory', resource: 'stocktake', action: 'complete', description: 'Complete stock-takes' },
  { module: 'inventory', resource: 'metal', action: 'read', description: 'View metal stock' },
  { module: 'inventory', resource: 'metal', action: 'adjust', description: 'Adjust metal stock' },
  { module: 'inventory', resource: 'stone', action: 'read', description: 'View stone stock' },
  { module: 'inventory', resource: 'stone', action: 'adjust', description: 'Adjust stone stock' },
  { module: 'inventory', resource: 'serial', action: 'read', description: 'View serial numbers' },
  { module: 'inventory', resource: 'serial', action: 'update', description: 'Manage serial numbers' },

  // ─── Manufacturing ────────────────────────────────────────
  { module: 'manufacturing', resource: 'job', action: 'create', description: 'Create job orders' },
  { module: 'manufacturing', resource: 'job', action: 'read', description: 'View job orders' },
  { module: 'manufacturing', resource: 'job', action: 'update', description: 'Update job orders' },
  { module: 'manufacturing', resource: 'job', action: 'delete', description: 'Cancel job orders' },
  { module: 'manufacturing', resource: 'job', action: 'complete', description: 'Complete job orders' },
  { module: 'manufacturing', resource: 'bom', action: 'create', description: 'Create bill of materials' },
  { module: 'manufacturing', resource: 'bom', action: 'read', description: 'View bill of materials' },
  { module: 'manufacturing', resource: 'bom', action: 'update', description: 'Edit bill of materials' },
  { module: 'manufacturing', resource: 'bom', action: 'delete', description: 'Delete bill of materials' },
  { module: 'manufacturing', resource: 'karigar', action: 'create', description: 'Add karigars/artisans' },
  { module: 'manufacturing', resource: 'karigar', action: 'read', description: 'View karigars' },
  { module: 'manufacturing', resource: 'karigar', action: 'update', description: 'Edit karigar details' },
  { module: 'manufacturing', resource: 'plan', action: 'create', description: 'Create production plans' },
  { module: 'manufacturing', resource: 'plan', action: 'read', description: 'View production plans' },
  { module: 'manufacturing', resource: 'plan', action: 'update', description: 'Edit production plans' },

  // ─── Retail ───────────────────────────────────────────────
  { module: 'retail', resource: 'sale', action: 'create', description: 'Create sales/POS transactions' },
  { module: 'retail', resource: 'sale', action: 'read', description: 'View sales history' },
  { module: 'retail', resource: 'sale', action: 'void', description: 'Void sales' },
  { module: 'retail', resource: 'return', action: 'create', description: 'Process returns' },
  { module: 'retail', resource: 'return', action: 'read', description: 'View returns' },
  { module: 'retail', resource: 'customorder', action: 'create', description: 'Create custom orders' },
  { module: 'retail', resource: 'customorder', action: 'read', description: 'View custom orders' },
  { module: 'retail', resource: 'customorder', action: 'update', description: 'Edit custom orders' },
  { module: 'retail', resource: 'repair', action: 'create', description: 'Create repair tickets' },
  { module: 'retail', resource: 'repair', action: 'read', description: 'View repair tickets' },
  { module: 'retail', resource: 'repair', action: 'update', description: 'Update repair status' },
  { module: 'retail', resource: 'exchange', action: 'create', description: 'Process old gold/silver exchange' },

  // ─── Financial ────────────────────────────────────────────
  { module: 'financial', resource: 'invoice', action: 'create', description: 'Create invoices' },
  { module: 'financial', resource: 'invoice', action: 'read', description: 'View invoices' },
  { module: 'financial', resource: 'invoice', action: 'update', description: 'Edit invoices' },
  { module: 'financial', resource: 'invoice', action: 'delete', description: 'Cancel invoices' },
  { module: 'financial', resource: 'payment', action: 'create', description: 'Record payments' },
  { module: 'financial', resource: 'payment', action: 'read', description: 'View payments' },
  { module: 'financial', resource: 'journal', action: 'create', description: 'Create journal entries' },
  { module: 'financial', resource: 'journal', action: 'read', description: 'View journal entries' },
  { module: 'financial', resource: 'account', action: 'create', description: 'Create chart of accounts' },
  { module: 'financial', resource: 'account', action: 'read', description: 'View chart of accounts' },
  { module: 'financial', resource: 'account', action: 'update', description: 'Edit accounts' },
  { module: 'financial', resource: 'gst', action: 'read', description: 'View GST reports' },
  { module: 'financial', resource: 'gst', action: 'file', description: 'File GST returns' },
  { module: 'financial', resource: 'tds', action: 'read', description: 'View TDS/TCS reports' },
  { module: 'financial', resource: 'bank', action: 'read', description: 'View bank reconciliation' },
  { module: 'financial', resource: 'bank', action: 'reconcile', description: 'Perform bank reconciliation' },
  { module: 'financial', resource: 'budget', action: 'create', description: 'Create budgets' },
  { module: 'financial', resource: 'budget', action: 'read', description: 'View budgets' },

  // ─── CRM ──────────────────────────────────────────────────
  { module: 'crm', resource: 'customer', action: 'create', description: 'Add customers' },
  { module: 'crm', resource: 'customer', action: 'read', description: 'View customers' },
  { module: 'crm', resource: 'customer', action: 'update', description: 'Edit customers' },
  { module: 'crm', resource: 'customer', action: 'delete', description: 'Remove customers' },
  { module: 'crm', resource: 'loyalty', action: 'read', description: 'View loyalty programs' },
  { module: 'crm', resource: 'loyalty', action: 'manage', description: 'Manage loyalty points & tiers' },
  { module: 'crm', resource: 'campaign', action: 'create', description: 'Create marketing campaigns' },
  { module: 'crm', resource: 'campaign', action: 'read', description: 'View campaigns' },
  { module: 'crm', resource: 'campaign', action: 'send', description: 'Send campaign notifications' },

  // ─── Wholesale ────────────────────────────────────────────
  { module: 'wholesale', resource: 'supplier', action: 'create', description: 'Add suppliers' },
  { module: 'wholesale', resource: 'supplier', action: 'read', description: 'View suppliers' },
  { module: 'wholesale', resource: 'supplier', action: 'update', description: 'Edit suppliers' },
  { module: 'wholesale', resource: 'purchase', action: 'create', description: 'Create purchase orders' },
  { module: 'wholesale', resource: 'purchase', action: 'read', description: 'View purchase orders' },
  { module: 'wholesale', resource: 'purchase', action: 'approve', description: 'Approve purchase orders' },
  { module: 'wholesale', resource: 'consignment', action: 'create', description: 'Create consignments' },
  { module: 'wholesale', resource: 'consignment', action: 'read', description: 'View consignments' },
  { module: 'wholesale', resource: 'consignment', action: 'return', description: 'Return consignments' },
  { module: 'wholesale', resource: 'consignment', action: 'settle', description: 'Settle consignments' },

  // ─── E-Commerce ───────────────────────────────────────────
  { module: 'ecommerce', resource: 'product', action: 'create', description: 'Publish products online' },
  { module: 'ecommerce', resource: 'product', action: 'read', description: 'View online products' },
  { module: 'ecommerce', resource: 'product', action: 'update', description: 'Edit online products' },
  { module: 'ecommerce', resource: 'order', action: 'read', description: 'View online orders' },
  { module: 'ecommerce', resource: 'order', action: 'process', description: 'Process online orders' },
  { module: 'ecommerce', resource: 'channel', action: 'read', description: 'View sales channels' },
  { module: 'ecommerce', resource: 'channel', action: 'manage', description: 'Manage sales channels' },

  // ─── Compliance ───────────────────────────────────────────
  { module: 'compliance', resource: 'hallmark', action: 'read', description: 'View hallmark records' },
  { module: 'compliance', resource: 'hallmark', action: 'register', description: 'Register HUID' },
  { module: 'compliance', resource: 'hallmark', action: 'verify', description: 'Verify hallmark' },
  { module: 'compliance', resource: 'kyc', action: 'read', description: 'View KYC records' },
  { module: 'compliance', resource: 'kyc', action: 'update', description: 'Update KYC records' },

  // ─── Reporting ────────────────────────────────────────────
  { module: 'reporting', resource: 'dashboard', action: 'read', description: 'View dashboards' },
  { module: 'reporting', resource: 'report', action: 'read', description: 'View reports' },
  { module: 'reporting', resource: 'report', action: 'export', description: 'Export reports' },
  { module: 'reporting', resource: 'analytics', action: 'read', description: 'View analytics' },
];

@Injectable()
export class PlatformRoleService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /** Seed the global permission catalog on first boot. Idempotent. */
  async seedDefaultPermissions(): Promise<{ created: number; existing: number }> {
    let created = 0;
    let existing = 0;

    for (const perm of DEFAULT_PERMISSIONS) {
      const exists = await this.prisma.permission.findUnique({
        where: { module_resource_action: { module: perm.module, resource: perm.resource, action: perm.action } },
      });
      if (exists) {
        existing++;
        continue;
      }
      await this.prisma.permission.create({
        data: {
          id: uuid(),
          module: perm.module,
          resource: perm.resource,
          action: perm.action,
          description: perm.description,
        },
      });
      created++;
    }

    return { created, existing };
  }

  /** Get all permissions from the global catalog, grouped by module. */
  async getAllPermissions(): Promise<Record<string, Array<{ resource: string; action: string; description: string | null }>>> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
    });

    const grouped: Record<string, Array<{ resource: string; action: string; description: string | null }>> = {};
    for (const p of permissions) {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push({ resource: p.resource, action: p.action, description: p.description });
    }

    return grouped;
  }

  /** Create a new role with a set of permissions. */
  async createRole(tenantId: string, input: CreateRoleInput, audit: AuditMeta) {
    const existing = await this.prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name: input.name } },
    });
    if (existing) {
      throw new ConflictException(`Role "${input.name}" already exists`);
    }

    // Convert permission strings array to structured JSON for Role.permissions
    const permissionsJson = this.permissionsArrayToJson(input.permissions);

    return this.prisma.role.create({
      data: {
        id: uuid(),
        tenantId,
        name: input.name,
        description: input.description ?? null,
        permissions: permissionsJson,
        isSystem: false,
        createdBy: audit.userId,
      },
    });
  }

  /** Update an existing role. */
  async updateRole(tenantId: string, roleId: string, input: UpdateRoleInput, audit: AuditMeta) {
    const role = await this.prisma.role.findFirst({
      where: this.tenantWhere(tenantId, { id: roleId }),
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new BadRequestException('Cannot modify a system role');
    }

    if (input.name && input.name !== role.name) {
      const nameConflict = await this.prisma.role.findUnique({
        where: { tenantId_name: { tenantId, name: input.name } },
      });
      if (nameConflict) {
        throw new ConflictException(`Role "${input.name}" already exists`);
      }
    }

    const data: Record<string, unknown> = { updatedBy: audit.userId };
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.permissions !== undefined) {
      data.permissions = this.permissionsArrayToJson(input.permissions);
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data,
    });
  }

  /** Delete a role (must not be a system role, must not have active users). */
  async deleteRole(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: this.tenantWhere(tenantId, { id: roleId }),
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete a system role');
    }
    if (role._count.users > 0) {
      throw new BadRequestException(`Cannot delete role with ${role._count.users} active user(s). Reassign them first.`);
    }

    await this.prisma.role.delete({ where: { id: roleId } });
    return { success: true };
  }

  /** List roles for a tenant. */
  async listRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }

  /** Get a single role with permissions detail. */
  async getRoleById(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: this.tenantWhere(tenantId, { id: roleId }),
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  /** Assign a role to a user. */
  async assignRoleToUser(tenantId: string, userId: string, roleId: string, audit: AuditMeta) {
    const role = await this.prisma.role.findFirst({
      where: this.tenantWhere(tenantId, { id: roleId }),
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const user = await this.prisma.user.findFirst({
      where: this.tenantWhere(tenantId, { id: userId }),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId, updatedBy: audit.userId },
      select: { id: true, email: true, roleId: true },
    });
  }

  /** Check if a user has a specific permission. Used by PermissionGuard. */
  async checkPermission(tenantId: string, userId: string, requiredPermission: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: this.tenantWhere(tenantId, { id: userId }),
      include: { role: true },
    });
    if (!user || !user.role) return false;

    const permissions = this.extractPermissionStrings(user.role.permissions);
    return permissions.some((p) => {
      if (p === '*') return true;
      if (p === requiredPermission) return true;
      if (p.endsWith('.*') && requiredPermission.startsWith(p.slice(0, -2))) return true;
      return false;
    });
  }

  // ─── Private Helpers ─────────────────────────────────────────

  /**
   * Convert flat permission strings to the JSON format stored in Role.permissions.
   * Input: ["inventory.item.create", "inventory.item.read", "retail.sale.create"]
   * Output: { "inventory.item": ["create", "read"], "retail.sale": ["create"] }
   */
  private permissionsArrayToJson(permissions: string[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const perm of permissions) {
      const parts = perm.split('.');
      if (parts.length < 3) continue;
      const key = parts.slice(0, -1).join('.');
      const action = parts[parts.length - 1];
      if (!result[key]) result[key] = [];
      if (!result[key].includes(action)) result[key].push(action);
    }
    return result;
  }

  /** Extract flat permission strings from role's JSON format. */
  private extractPermissionStrings(permissionsJson: unknown): string[] {
    if (!permissionsJson || typeof permissionsJson !== 'object') return [];
    const result: string[] = [];
    for (const [key, value] of Object.entries(permissionsJson as Record<string, unknown>)) {
      if (key === '*') {
        result.push('*');
        continue;
      }
      if (Array.isArray(value)) {
        for (const action of value) {
          result.push(`${key}.${action}`);
        }
      } else {
        result.push(key);
      }
    }
    return result;
  }
}
