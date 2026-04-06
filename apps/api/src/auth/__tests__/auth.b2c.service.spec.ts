import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { B2CAuthService } from '../auth.b2c.service';
import {
  createMockPrismaService,
  createMockCustomerAuth,
  mockTenantContext,
  TEST_TENANT,
  resetMocks,
} from '../../__tests__/mocks';

vi.mock('bcryptjs', async () => {
  const actual = await vi.importActual<typeof import('bcryptjs')>('bcryptjs');
  return {
    ...actual,
    hash: vi.fn().mockResolvedValue('$2a$12$mockedhashvalue'),
    compare: vi.fn(),
  };
});

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2, 10)),
}));

describe('B2CAuthService', () => {
  let service: B2CAuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let otpService: { generateOtp: ReturnType<typeof vi.fn>; verifyOtp: ReturnType<typeof vi.fn> };
  let socialAuthService: {
    verifySocialToken: ReturnType<typeof vi.fn>;
    findCustomerBySocialAccount: ReturnType<typeof vi.fn>;
    linkSocialAccount: ReturnType<typeof vi.fn>;
  };
  let twoFactorService: { verify2FA: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    otpService = {
      generateOtp: vi.fn().mockResolvedValue({ message: 'OTP sent', otp: '123456' }),
      verifyOtp: vi.fn().mockResolvedValue(true),
    };
    socialAuthService = {
      verifySocialToken: vi.fn(),
      findCustomerBySocialAccount: vi.fn(),
      linkSocialAccount: vi.fn(),
    };
    twoFactorService = {
      verify2FA: vi.fn().mockResolvedValue(true),
    };

    service = new B2CAuthService(
      prisma as never,
      otpService as never,
      socialAuthService as never,
      twoFactorService as never,
    );
  });

  // ─── Register with Email ───────────────────────────────────────

  describe('registerWithEmail', () => {
    it('should create Customer and CustomerAuth on success', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.customerAuth.findUnique.mockResolvedValue(null);
      const mockAuth = createMockCustomerAuth({ email: 'new@example.com' });
      prisma.$transaction.mockResolvedValue([{}, mockAuth]);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      const result = await service.registerWithEmail(
        'new@example.com',
        'StrongPass1!',
        'New',
        'Customer',
        'test-jewelry-store',
      );

      expect(result).toHaveProperty('customer');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.customer).toHaveProperty('email', 'new@example.com');
    });

    it('should throw ConflictException if email already registered', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.customerAuth.findUnique.mockResolvedValue(createMockCustomerAuth());

      await expect(
        service.registerWithEmail('existing@example.com', 'Pass1!', 'A', 'B', 'test-jewelry-store'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw for invalid tenant slug', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.registerWithEmail('a@b.com', 'Pass1!', 'A', 'B', 'nonexistent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should hash password with 12 salt rounds', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.customerAuth.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([{}, createMockCustomerAuth()]);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      await service.registerWithEmail('a@b.com', 'ThePass', 'A', 'B', 'test-jewelry-store');

      expect(bcrypt.hash).toHaveBeenCalledWith('ThePass', 12);
    });
  });

  // ─── Register with Phone ───────────────────────────────────────

  describe('registerWithPhone', () => {
    it('should create Customer and send OTP', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.customerAuth.findUnique.mockResolvedValue(null);
      const mockAuth = createMockCustomerAuth({
        phone: '+919876543210',
        email: null,
        loginProvider: 'PHONE',
      });
      prisma.$transaction.mockResolvedValue([{}, mockAuth]);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      const result = await service.registerWithPhone(
        '+919876543210',
        'StrongPass1!',
        'Phone',
        'User',
        'test-jewelry-store',
      );

      expect(result).toHaveProperty('customer');
      expect(otpService.generateOtp).toHaveBeenCalledWith('+919876543210', 'REGISTRATION');
    });

    it('should throw ConflictException if phone already registered', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.customerAuth.findUnique.mockResolvedValue(
        createMockCustomerAuth({ phone: '+919876543210' }),
      );

      await expect(
        service.registerWithPhone('+919876543210', 'Pass1!', 'A', 'B', 'test-jewelry-store'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── Login with Email ──────────────────────────────────────────

  describe('loginWithEmail', () => {
    it('should return B2C JWT with type b2c on correct credentials', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      const mockAuth = createMockCustomerAuth();
      prisma.customerAuth.findUnique.mockResolvedValue(mockAuth);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.customerAuth.update.mockResolvedValue(mockAuth);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      const result = await service.loginWithEmail(
        'customer@example.com',
        'Password123!',
        'test-jewelry-store',
      );

      expect(result).toHaveProperty('accessToken');
      const decoded = jwt.decode(result.accessToken) as Record<string, unknown>;
      expect(decoded.type).toBe('b2c');
    });

    it('should include customerId and tenantId in B2C JWT', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      const mockAuth = createMockCustomerAuth();
      prisma.customerAuth.findUnique.mockResolvedValue(mockAuth);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.customerAuth.update.mockResolvedValue(mockAuth);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      const result = await service.loginWithEmail(
        'customer@example.com',
        'Password123!',
        'test-jewelry-store',
      );

      const decoded = jwt.decode(result.accessToken) as Record<string, unknown>;
      expect(decoded.customerId).toBe(mockAuth.customerId);
      expect(decoded.tenantId).toBe(mockTenantContext.tenantId);
    });

    it('should throw for wrong password', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.customerAuth.findUnique.mockResolvedValue(createMockCustomerAuth());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.loginWithEmail('customer@example.com', 'WrongPass', 'test-jewelry-store'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for non-existent customer', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.customerAuth.findUnique.mockResolvedValue(null);

      await expect(
        service.loginWithEmail('nobody@example.com', 'Pass', 'test-jewelry-store'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for customer from different tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...TEST_TENANT, id: 'other-tenant-id' });
      prisma.customerAuth.findUnique.mockResolvedValue(createMockCustomerAuth());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(
        service.loginWithEmail('customer@example.com', 'Pass', 'test-jewelry-store'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should require 2FA code when enabled', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      prisma.customerAuth.findUnique.mockResolvedValue(
        createMockCustomerAuth({ twoFactorEnabled: true }),
      );
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(
        service.loginWithEmail('customer@example.com', 'Pass', 'test-jewelry-store'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should succeed with valid 2FA code when enabled', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      const mockAuth = createMockCustomerAuth({ twoFactorEnabled: true });
      prisma.customerAuth.findUnique.mockResolvedValue(mockAuth);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.customerAuth.update.mockResolvedValue(mockAuth);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      const result = await service.loginWithEmail(
        'customer@example.com',
        'Pass',
        'test-jewelry-store',
        '123456',
      );

      expect(result).toHaveProperty('accessToken');
      expect(twoFactorService.verify2FA).toHaveBeenCalledWith(mockAuth.id, '123456');
    });
  });

  // ─── Social Login ──────────────────────────────────────────────

  describe('socialLogin', () => {
    it('should create new customer if first-time social login', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      socialAuthService.verifySocialToken.mockResolvedValue({
        providerAccountId: 'google-123',
        email: 'social@example.com',
        firstName: 'Social',
        lastName: 'User',
      });
      socialAuthService.findCustomerBySocialAccount.mockResolvedValue(null);
      prisma.customerAuth.findUnique.mockResolvedValue(null); // no existing email

      const newAuth = createMockCustomerAuth({ email: 'social@example.com' });
      prisma.$transaction.mockResolvedValue([{}, newAuth]);
      prisma.customerAuth.update.mockResolvedValue(newAuth);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      const result = await service.socialLogin('GOOGLE' as never, 'id-token', undefined, 'test-jewelry-store');

      expect(result).toHaveProperty('customer');
      expect(result).toHaveProperty('accessToken');
      expect(socialAuthService.linkSocialAccount).toHaveBeenCalled();
    });

    it('should link account if existing email-based customer found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      socialAuthService.verifySocialToken.mockResolvedValue({
        providerAccountId: 'google-456',
        email: 'existing@example.com',
      });
      socialAuthService.findCustomerBySocialAccount.mockResolvedValue(null);

      const existingAuth = createMockCustomerAuth({ email: 'existing@example.com' });
      prisma.customerAuth.findUnique.mockResolvedValue(existingAuth);
      prisma.customerAuth.update.mockResolvedValue(existingAuth);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      const result = await service.socialLogin('GOOGLE' as never, 'id-token', undefined, 'test-jewelry-store');

      expect(result).toHaveProperty('customer');
      expect(socialAuthService.linkSocialAccount).toHaveBeenCalledWith(
        existingAuth.id,
        'GOOGLE',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should return tokens for existing social account', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      socialAuthService.verifySocialToken.mockResolvedValue({
        providerAccountId: 'google-789',
        email: 'social@example.com',
      });
      const existingAuth = createMockCustomerAuth();
      socialAuthService.findCustomerBySocialAccount.mockResolvedValue(existingAuth);
      prisma.customerAuth.update.mockResolvedValue(existingAuth);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      const result = await service.socialLogin('GOOGLE' as never, 'id-token', undefined, 'test-jewelry-store');

      expect(result).toHaveProperty('accessToken');
      expect(socialAuthService.linkSocialAccount).not.toHaveBeenCalled();
    });

    it('should throw if existing social account belongs to different tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      socialAuthService.verifySocialToken.mockResolvedValue({
        providerAccountId: 'google-000',
      });
      socialAuthService.findCustomerBySocialAccount.mockResolvedValue({
        ...createMockCustomerAuth(),
        customer: { tenantId: 'different-tenant-id' },
      });

      await expect(
        service.socialLogin('GOOGLE' as never, 'id-token', undefined, 'test-jewelry-store'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── B2C JWT Token Content ─────────────────────────────────────

  describe('B2C JWT payload', () => {
    it('should have correct customerId and tenantId', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      const mockAuth = createMockCustomerAuth();
      prisma.customerAuth.findUnique.mockResolvedValue(mockAuth);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.customerAuth.update.mockResolvedValue(mockAuth);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      const result = await service.loginWithEmail('customer@example.com', 'Pass', 'test-jewelry-store');
      const decoded = jwt.decode(result.accessToken) as Record<string, unknown>;

      expect(decoded.customerId).toBe(mockAuth.customerId);
      expect(decoded.tenantId).toBe(mockTenantContext.tenantId);
      expect(decoded.type).toBe('b2c');
      expect(decoded.sub).toBe(mockAuth.id);
    });

    it('should have 1800s (30min) expiry', async () => {
      prisma.tenant.findUnique.mockResolvedValue(TEST_TENANT);
      const mockAuth = createMockCustomerAuth();
      prisma.customerAuth.findUnique.mockResolvedValue(mockAuth);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.customerAuth.update.mockResolvedValue(mockAuth);
      prisma.customerRefreshToken.create.mockResolvedValue({ id: 'crt-id' });

      const result = await service.loginWithEmail('customer@example.com', 'Pass', 'test-jewelry-store');

      expect(result.expiresIn).toBe(1800);
    });
  });
});
