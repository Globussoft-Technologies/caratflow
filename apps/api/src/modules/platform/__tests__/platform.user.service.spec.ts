import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PlatformUserService } from '../platform.user.service';
import {
  createMockPrismaService,
  createMockEventBus,
  TEST_TENANT_ID,
  TEST_USER_ID,
  resetAllMocks,
} from '../../../__tests__/setup';

describe('PlatformUserService (Unit)', () => {
  let service: PlatformUserService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const audit = { userId: TEST_USER_ID };

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    service = new PlatformUserService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  // ─── inviteUser ─────────────────────────────────────────────

  describe('inviteUser', () => {
    it('creates a user with a temporary password and publishes event', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        roleId: null,
        isActive: true,
        createdAt: new Date(),
      });

      const result = await service.inviteUser(TEST_TENANT_ID, {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      }, audit);

      expect(result.email).toBe('new@example.com');
      expect(result.tempPassword).toBeDefined();
      expect(result.tempPassword.length).toBe(12);
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'platform.user.created' }),
      );
    });

    it('throws ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.inviteUser(TEST_TENANT_ID, {
          email: 'existing@example.com',
          firstName: 'E',
          lastName: 'U',
        }, audit),
      ).rejects.toThrow(ConflictException);
    });

    it('assigns a roleId when provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'u-1',
        email: 'r@example.com',
        firstName: 'R',
        lastName: 'U',
        roleId: 'role-1',
        isActive: true,
        createdAt: new Date(),
      });

      await service.inviteUser(TEST_TENANT_ID, {
        email: 'r@example.com',
        firstName: 'R',
        lastName: 'U',
        roleId: 'role-1',
      }, audit);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roleId: 'role-1' }),
        }),
      );
    });
  });

  // ─── listUsers ──────────────────────────────────────────────

  describe('listUsers', () => {
    it('returns paginated users', async () => {
      const users = [{ id: 'u1' }, { id: 'u2' }];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(12);

      const result = await service.listUsers(TEST_TENANT_ID, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(12);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(false);
    });

    it('filters by search term', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.listUsers(TEST_TENANT_ID, { page: 1, limit: 10, search: 'john' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'john' } },
            ]),
          }),
        }),
      );
    });

    it('filters by isActive flag', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.listUsers(TEST_TENANT_ID, { page: 1, limit: 10, isActive: true });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  // ─── getUserById ────────────────────────────────────────────

  describe('getUserById', () => {
    it('returns user when found', async () => {
      const user = { id: 'u-1', email: 'x@y.com', firstName: 'X', lastName: 'Y' };
      mockPrisma.user.findFirst.mockResolvedValue(user);

      const result = await service.getUserById(TEST_TENANT_ID, 'u-1');
      expect(result.id).toBe('u-1');
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.getUserById(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── activateUser / deactivateUser ──────────────────────────

  describe('activateUser', () => {
    it('sets isActive to true', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u-1' });
      mockPrisma.user.update.mockResolvedValue({ id: 'u-1', isActive: true });

      const result = await service.activateUser(TEST_TENANT_ID, 'u-1', audit);
      expect(result.isActive).toBe(true);
    });
  });

  describe('deactivateUser', () => {
    it('sets isActive to false', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u-2' });
      mockPrisma.user.update.mockResolvedValue({ id: 'u-2', isActive: false });

      const result = await service.deactivateUser(TEST_TENANT_ID, 'u-2', { userId: 'different-user' });
      expect(result.isActive).toBe(false);
    });

    it('prevents deactivating own account', async () => {
      await expect(
        service.deactivateUser(TEST_TENANT_ID, TEST_USER_ID, audit),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for unknown user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivateUser(TEST_TENANT_ID, 'unknown', { userId: 'other' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateProfile ──────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates firstName and lastName', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u-1' });
      mockPrisma.user.update.mockResolvedValue({
        id: 'u-1',
        firstName: 'Updated',
        lastName: 'Name',
      });

      const result = await service.updateProfile(TEST_TENANT_ID, 'u-1', {
        firstName: 'Updated',
        lastName: 'Name',
      }, audit);

      expect(result.firstName).toBe('Updated');
    });
  });

  // ─── enforcePasswordPolicy ──────────────────────────────────

  describe('enforcePasswordPolicy', () => {
    it('accepts a strong password', () => {
      expect(() => service.enforcePasswordPolicy('StrongP@ss1')).not.toThrow();
    });

    it('rejects password shorter than 8 characters', () => {
      expect(() => service.enforcePasswordPolicy('Sh@1')).toThrow(BadRequestException);
    });

    it('rejects password without uppercase', () => {
      expect(() => service.enforcePasswordPolicy('lowercase@1')).toThrow(BadRequestException);
    });

    it('rejects password without lowercase', () => {
      expect(() => service.enforcePasswordPolicy('UPPERCASE@1')).toThrow(BadRequestException);
    });

    it('rejects password without numbers', () => {
      expect(() => service.enforcePasswordPolicy('NoNumbers@!')).toThrow(BadRequestException);
    });

    it('rejects password without special characters', () => {
      expect(() => service.enforcePasswordPolicy('NoSpecial1A')).toThrow(BadRequestException);
    });
  });

  // ─── changePassword ─────────────────────────────────────────

  describe('changePassword', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.changePassword(TEST_TENANT_ID, 'u-1', {
          currentPassword: 'old',
          newPassword: 'New@Pass1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when current password is wrong', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-1',
        passwordHash: '$2a$12$invalidhash',
      });

      await expect(
        service.changePassword(TEST_TENANT_ID, 'u-1', {
          currentPassword: 'wrongpassword',
          newPassword: 'New@Pass1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
