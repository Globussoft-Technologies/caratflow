import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../auth.service';
import {
  createMockPrismaService,
  createMockUser,
  mockTenantContext,
  TEST_TENANT,
  resetMocks,
} from '../../__tests__/mocks';

// Mock bcryptjs
vi.mock('bcryptjs', async () => {
  const actual = await vi.importActual<typeof import('bcryptjs')>('bcryptjs');
  return {
    ...actual,
    hash: vi.fn().mockResolvedValue('$2a$12$mockedhashvalue'),
    compare: vi.fn(),
  };
});

// Mock uuid to return predictable values
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2, 10)),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    service = new AuthService(prisma as never);
    resetMocks(prisma);
    vi.mocked(bcrypt.compare).mockReset();
    vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$mockedhashvalue' as never);
  });

  // ─── Register ──────────────────────────────────────────────────

  describe('register', () => {
    it('should create a new user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const createdUser = {
        id: 'new-user-id',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        tenantId: mockTenantContext.tenantId,
        createdAt: new Date(),
      };
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register({
        tenantId: mockTenantContext.tenantId,
        email: 'new@example.com',
        password: 'StrongPass123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result).toEqual(createdUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId: mockTenantContext.tenantId,
            email: 'new@example.com',
          },
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass123!', 12);
    });

    it('should throw ConflictException for duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue(createMockUser());

      await expect(
        service.register({
          tenantId: mockTenantContext.tenantId,
          email: 'user@example.com',
          password: 'StrongPass123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash the password with salt rounds of 12', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'id',
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        tenantId: 't',
        createdAt: new Date(),
      });

      await service.register({
        tenantId: 't',
        email: 'a@b.com',
        password: 'MyPass',
        firstName: 'A',
        lastName: 'B',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('MyPass', 12);
    });

    it('should pass roleId when provided', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'id' });

      await service.register({
        tenantId: 't',
        email: 'a@b.com',
        password: 'MyPass',
        firstName: 'A',
        lastName: 'B',
        roleId: 'role-admin',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roleId: 'role-admin' }),
        }),
      );
    });
  });

  // ─── Login ─────────────────────────────────────────────────────

  describe('login', () => {
    const mockUser = createMockUser();

    it('should return JWT token pair on correct credentials', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-id' });

      const result = await service.login('user@example.com', 'Password123!', 'test-jewelry-store');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', 900);
      expect(typeof result.accessToken).toBe('string');
    });

    it('should include correct tenantId and userId in JWT payload', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-id' });

      const result = await service.login('user@example.com', 'Password123!', 'test-jewelry-store');

      const decoded = jwt.decode(result.accessToken) as Record<string, unknown>;
      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.tenantId).toBe(mockTenantContext.tenantId);
      expect(decoded.email).toBe('user@example.com');
    });

    it('should include permissions extracted from role in JWT', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-id' });

      const result = await service.login('user@example.com', 'Password123!', 'test-jewelry-store');

      const decoded = jwt.decode(result.accessToken) as Record<string, unknown>;
      const permissions = decoded.permissions as string[];
      expect(permissions).toContain('inventory.read');
      expect(permissions).toContain('inventory.write');
      expect(permissions).toContain('retail.read');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login('user@example.com', 'WrongPass', 'test-jewelry-store'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.user.findUnique.mockResolvedValue(createMockUser({ isActive: false }));

      await expect(
        service.login('user@example.com', 'Password123!', 'test-jewelry-store'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('noone@example.com', 'Password123!', 'test-jewelry-store'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid tenant slug', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.login('user@example.com', 'Password123!', 'nonexistent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...TEST_TENANT, isActive: false });

      await expect(
        service.login('user@example.com', 'Password123!', 'test-jewelry-store'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should update lastLoginAt on successful login', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-id' });

      await service.login('user@example.com', 'Password123!', 'test-jewelry-store');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  // ─── Refresh Tokens ────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('should rotate refresh token and return new token pair', async () => {
      const mockUser = createMockUser();
      const storedToken = {
        id: 'rt-id',
        token: 'valid-refresh-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        user: mockUser,
      };

      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      prisma.refreshToken.update.mockResolvedValue({ ...storedToken, revokedAt: new Date() });
      prisma.refreshToken.create.mockResolvedValue({ id: 'new-rt-id' });

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-id' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should reject expired refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-id',
        token: 'expired-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        user: createMockUser(),
      });

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject revoked refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-id',
        token: 'revoked-token',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        user: createMockUser(),
      });

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject non-existent refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── Logout ────────────────────────────────────────────────────

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('some-refresh-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should not throw if token does not exist (idempotent)', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('nonexistent-token')).resolves.toBeUndefined();
    });
  });

  // ─── JWT Token Verification ────────────────────────────────────

  describe('JWT token format', () => {
    it('should generate a valid JWT that can be decoded', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.user.findUnique.mockResolvedValue(createMockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-id' });

      const result = await service.login('user@example.com', 'Password123!', 'test-jewelry-store');

      const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production';
      const verified = jwt.verify(result.accessToken, secret) as Record<string, unknown>;
      expect(verified.sub).toBeDefined();
      expect(verified.tenantId).toBeDefined();
    });

    it('should reject token signed with wrong secret', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.user.findUnique.mockResolvedValue(createMockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-id' });

      const result = await service.login('user@example.com', 'Password123!', 'test-jewelry-store');

      expect(() => jwt.verify(result.accessToken, 'wrong-secret')).toThrow();
    });
  });

  // ─── Forgot Password ──────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should return generic message regardless of user existence', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com', 'test-jewelry-store');

      expect(result.message).toContain('If an account exists');
    });

    it('should return generic message when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('user@example.com', 'nonexistent');

      expect(result.message).toContain('If an account exists');
    });
  });
});
