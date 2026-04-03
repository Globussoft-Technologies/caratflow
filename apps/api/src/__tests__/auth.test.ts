import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../auth/auth.service';
import { createMockPrismaService, TEST_TENANT_ID, resetAllMocks } from './setup';

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    authService = new AuthService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── Register ────────────────────────────────────────────────

  describe('register', () => {
    it('creates a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        tenantId: TEST_TENANT_ID,
        createdAt: new Date(),
      });

      const result = await authService.register({
        tenantId: TEST_TENANT_ID,
        email: 'new@example.com',
        password: 'securePassword123',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.email).toBe('new@example.com');
      expect(result.firstName).toBe('New');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);

      // Verify password was hashed (not stored in plain text)
      const createCall = mockPrisma.user.create.mock.calls[0]![0];
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe('securePassword123');
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });

      await expect(
        authService.register({
          tenantId: TEST_TENANT_ID,
          email: 'existing@example.com',
          password: 'password',
          firstName: 'Existing',
          lastName: 'User',
        }),
      ).rejects.toThrow('User with this email already exists');
    });
  });

  // ─── Login ───────────────────────────────────────────────────

  describe('login', () => {
    const validPasswordHash = bcrypt.hashSync('correctPassword', 12);

    it('returns JWT and refresh token on valid credentials', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: 'test-store',
        isActive: true,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: TEST_TENANT_ID,
        email: 'user@example.com',
        passwordHash: validPasswordHash,
        isActive: true,
        role: { name: 'admin', permissions: { inventory: ['read', 'write'] } },
      });

      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await authService.login('user@example.com', 'correctPassword', 'test-store');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(900);

      // Verify the access token is a valid JWT
      const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET!) as Record<string, unknown>;
      expect(decoded.sub).toBe('user-1');
      expect(decoded.tenantId).toBe(TEST_TENANT_ID);
      expect(decoded.email).toBe('user@example.com');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: 'test-store',
        isActive: true,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: TEST_TENANT_ID,
        email: 'user@example.com',
        passwordHash: validPasswordHash,
        isActive: true,
        role: null,
      });

      await expect(
        authService.login('user@example.com', 'wrongPassword', 'test-store'),
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException for invalid tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('user@example.com', 'password', 'nonexistent'),
      ).rejects.toThrow('Invalid tenant');
    });

    it('throws UnauthorizedException for inactive tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: 'test-store',
        isActive: false,
      });

      await expect(
        authService.login('user@example.com', 'password', 'test-store'),
      ).rejects.toThrow('Invalid tenant');
    });

    it('throws UnauthorizedException for non-existent user', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: 'test-store',
        isActive: true,
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('nobody@example.com', 'password', 'test-store'),
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException for inactive user', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: 'test-store',
        isActive: true,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: TEST_TENANT_ID,
        email: 'inactive@example.com',
        passwordHash: validPasswordHash,
        isActive: false,
        role: null,
      });

      await expect(
        authService.login('inactive@example.com', 'correctPassword', 'test-store'),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  // ─── Refresh Token ───────────────────────────────────────────

  describe('refreshTokens', () => {
    it('returns new token pair and revokes old refresh token', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-refresh-token',
        userId: 'user-1',
        expiresAt: futureDate,
        revokedAt: null,
        user: {
          id: 'user-1',
          tenantId: TEST_TENANT_ID,
          email: 'user@example.com',
          role: { name: 'admin', permissions: {} },
        },
      });

      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

      const result = await authService.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Old token should be revoked
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt-1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('throws UnauthorizedException for expired refresh token', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'expired-token',
        userId: 'user-1',
        expiresAt: pastDate,
        revokedAt: null,
        user: { id: 'user-1', tenantId: TEST_TENANT_ID, email: 'user@example.com', role: null },
      });

      await expect(authService.refreshTokens('expired-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('throws UnauthorizedException for revoked refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'revoked-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(),
        user: { id: 'user-1', tenantId: TEST_TENANT_ID, email: 'user@example.com', role: null },
      });

      await expect(authService.refreshTokens('revoked-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('throws UnauthorizedException for non-existent refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(authService.refreshTokens('nonexistent-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });

  // ─── Logout ──────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await authService.logout('some-refresh-token');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
