import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PlatformRoleService } from '../platform.role.service';
import {
  createMockPrismaService,
  TEST_TENANT_ID,
  TEST_USER_ID,
  resetAllMocks,
} from '../../../__tests__/setup';

// Extend mock prisma with role/permission models
function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    permission: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('PlatformRoleService (Unit)', () => {
  let service: PlatformRoleService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  const audit = { userId: TEST_USER_ID };

  beforeEach(() => {
    const base = createMockPrismaService();
    mockPrisma = extendPrisma(base);
    service = new PlatformRoleService(mockPrisma as any);
  });

  // ─── seedDefaultPermissions ─────────────────────────────────

  describe('seedDefaultPermissions', () => {
    it('creates new permissions and counts existing ones', async () => {
      let callCount = 0;
      mockPrisma.permission.findUnique.mockImplementation(async () => {
        callCount++;
        return callCount <= 5 ? { id: 'existing' } : null;
      });
      mockPrisma.permission.create.mockResolvedValue({ id: 'new' });

      const result = await service.seedDefaultPermissions();

      expect(result.existing).toBeGreaterThanOrEqual(5);
      expect(result.created).toBeGreaterThan(0);
      expect(result.created + result.existing).toBeGreaterThan(0);
    });

    it('is idempotent - all existing returns zero created', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({ id: 'exists' });

      const result = await service.seedDefaultPermissions();

      expect(result.created).toBe(0);
      expect(result.existing).toBeGreaterThan(0);
    });
  });

  // ─── getAllPermissions ──────────────────────────────────────

  describe('getAllPermissions', () => {
    it('returns permissions grouped by module', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([
        { module: 'platform', resource: 'user', action: 'create', description: 'Create users' },
        { module: 'platform', resource: 'user', action: 'read', description: 'View users' },
        { module: 'inventory', resource: 'item', action: 'create', description: 'Add items' },
      ]);

      const result = await service.getAllPermissions();

      expect(result.platform).toHaveLength(2);
      expect(result.inventory).toHaveLength(1);
    });
  });

  // ─── createRole ─────────────────────────────────────────────

  describe('createRole', () => {
    it('creates a role with structured permissions JSON', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue({
        id: 'role-1',
        name: 'Manager',
        permissions: { 'inventory.item': ['create', 'read'], 'retail.sale': ['create'] },
        isSystem: false,
      });

      const result = await service.createRole(TEST_TENANT_ID, {
        name: 'Manager',
        permissions: ['inventory.item.create', 'inventory.item.read', 'retail.sale.create'],
      }, audit);

      expect(result.name).toBe('Manager');
      expect(mockPrisma.role.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            permissions: {
              'inventory.item': ['create', 'read'],
              'retail.sale': ['create'],
            },
          }),
        }),
      );
    });

    it('throws ConflictException if role name already exists', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createRole(TEST_TENANT_ID, {
          name: 'Duplicate',
          permissions: [],
        }, audit),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── updateRole ─────────────────────────────────────────────

  describe('updateRole', () => {
    it('updates role name and permissions', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'r-1', name: 'OldName', isSystem: false });
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.role.update.mockResolvedValue({ id: 'r-1', name: 'NewName' });

      const result = await service.updateRole(TEST_TENANT_ID, 'r-1', {
        name: 'NewName',
        permissions: ['platform.user.read'],
      }, audit);

      expect(result.name).toBe('NewName');
    });

    it('throws BadRequestException when modifying a system role', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'r-sys', isSystem: true });

      await expect(
        service.updateRole(TEST_TENANT_ID, 'r-sys', { name: 'Hacked' }, audit),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when renaming to existing name', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'r-1', name: 'OldName', isSystem: false });
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'r-other', name: 'Taken' });

      await expect(
        service.updateRole(TEST_TENANT_ID, 'r-1', { name: 'Taken' }, audit),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── deleteRole ─────────────────────────────────────────────

  describe('deleteRole', () => {
    it('deletes a non-system role with no users', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'r-1',
        isSystem: false,
        _count: { users: 0 },
      });
      mockPrisma.role.delete.mockResolvedValue({});

      const result = await service.deleteRole(TEST_TENANT_ID, 'r-1');
      expect(result.success).toBe(true);
    });

    it('throws BadRequestException when deleting a system role', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'r-sys',
        isSystem: true,
        _count: { users: 0 },
      });

      await expect(
        service.deleteRole(TEST_TENANT_ID, 'r-sys'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when role has active users', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'r-1',
        isSystem: false,
        _count: { users: 3 },
      });

      await expect(
        service.deleteRole(TEST_TENANT_ID, 'r-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for unknown role', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteRole(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listRoles / getRoleById ────────────────────────────────

  describe('listRoles', () => {
    it('returns roles for tenant ordered by name', async () => {
      mockPrisma.role.findMany.mockResolvedValue([{ id: 'r-1', name: 'Admin' }]);

      const result = await service.listRoles(TEST_TENANT_ID);
      expect(result).toHaveLength(1);
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });
  });

  describe('getRoleById', () => {
    it('returns role when found', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'r-1', name: 'Admin' });
      const result = await service.getRoleById(TEST_TENANT_ID, 'r-1');
      expect(result.name).toBe('Admin');
    });

    it('throws NotFoundException when role not found', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      await expect(service.getRoleById(TEST_TENANT_ID, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── assignRoleToUser ──────────────────────────────────────

  describe('assignRoleToUser', () => {
    it('assigns role to user', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'r-1' });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u-1' });
      mockPrisma.user.update.mockResolvedValue({ id: 'u-1', roleId: 'r-1' });

      const result = await service.assignRoleToUser(TEST_TENANT_ID, 'u-1', 'r-1', audit);
      expect(result.roleId).toBe('r-1');
    });

    it('throws NotFoundException if role does not exist', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.assignRoleToUser(TEST_TENANT_ID, 'u-1', 'bad-role', audit),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if user does not exist', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'r-1' });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assignRoleToUser(TEST_TENANT_ID, 'bad-user', 'r-1', audit),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── checkPermission ───────────────────────────────────────

  describe('checkPermission', () => {
    it('returns true for exact permission match', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-1',
        role: {
          permissions: { 'inventory.item': ['create', 'read'] },
        },
      });

      const result = await service.checkPermission(TEST_TENANT_ID, 'u-1', 'inventory.item.create');
      expect(result).toBe(true);
    });

    it('returns true for wildcard * permission', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-1',
        role: { permissions: { '*': [] } },
      });

      const result = await service.checkPermission(TEST_TENANT_ID, 'u-1', 'anything.here');
      expect(result).toBe(true);
    });

    it('returns true for module.* wildcard matching', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-1',
        role: { permissions: { 'inventory': ['*'] } },
      });

      const result = await service.checkPermission(TEST_TENANT_ID, 'u-1', 'inventory.item.delete');
      expect(result).toBe(true);
    });

    it('returns false when permission not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-1',
        role: { permissions: { 'inventory.item': ['read'] } },
      });

      const result = await service.checkPermission(TEST_TENANT_ID, 'u-1', 'inventory.item.delete');
      expect(result).toBe(false);
    });

    it('returns false when user has no role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u-1', role: null });

      const result = await service.checkPermission(TEST_TENANT_ID, 'u-1', 'anything');
      expect(result).toBe(false);
    });
  });
});
