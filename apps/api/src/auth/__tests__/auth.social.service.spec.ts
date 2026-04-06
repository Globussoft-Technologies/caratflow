import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { SocialAuthService } from '../auth.social.service';
import { createMockPrismaService, resetMocks } from '../../__tests__/mocks';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

describe('SocialAuthService', () => {
  let service: SocialAuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).socialAccount = {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    service = new SocialAuthService(prisma as never);
  });

  // ─── verifyGoogleToken ──────────────────────────────────────
  describe('verifyGoogleToken', () => {
    it('should throw UnauthorizedException (not configured)', async () => {
      await expect(service.verifyGoogleToken('fake-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should contain descriptive message about missing env vars', async () => {
      await expect(service.verifyGoogleToken('tok')).rejects.toThrow('Google OAuth not configured');
    });
  });

  // ─── verifyFacebookToken ────────────────────────────────────
  describe('verifyFacebookToken', () => {
    it('should throw UnauthorizedException (not configured)', async () => {
      await expect(service.verifyFacebookToken('fake-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should contain descriptive message about missing env vars', async () => {
      await expect(service.verifyFacebookToken('tok')).rejects.toThrow('Facebook OAuth not configured');
    });
  });

  // ─── verifyAppleToken ───────────────────────────────────────
  describe('verifyAppleToken', () => {
    it('should throw UnauthorizedException (not configured)', async () => {
      await expect(service.verifyAppleToken('fake-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should contain descriptive message about missing env vars', async () => {
      await expect(service.verifyAppleToken('tok')).rejects.toThrow('Apple Sign-In not configured');
    });
  });

  // ─── verifySocialToken ──────────────────────────────────────
  describe('verifySocialToken', () => {
    it('should require idToken for GOOGLE', async () => {
      await expect(service.verifySocialToken('GOOGLE' as any, undefined, 'access')).rejects.toThrow('Google login requires idToken');
    });

    it('should require accessToken for FACEBOOK', async () => {
      await expect(service.verifySocialToken('FACEBOOK' as any, 'id', undefined)).rejects.toThrow('Facebook login requires accessToken');
    });

    it('should require idToken for APPLE', async () => {
      await expect(service.verifySocialToken('APPLE' as any, undefined, 'access')).rejects.toThrow('Apple login requires idToken');
    });

    it('should throw for unsupported provider', async () => {
      await expect(service.verifySocialToken('TWITTER' as any)).rejects.toThrow('Unsupported social provider');
    });
  });

  // ─── linkSocialAccount ──────────────────────────────────────
  describe('linkSocialAccount', () => {
    const profile = {
      providerAccountId: 'google-123',
      email: 'test@example.com',
      name: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: null,
    };

    it('should create new link when no existing account', async () => {
      (prisma as any).socialAccount.findUnique.mockResolvedValue(null);
      (prisma as any).socialAccount.create.mockResolvedValue({ id: 'sa-1' });

      await service.linkSocialAccount('cust-1', 'GOOGLE' as any, profile);

      expect((prisma as any).socialAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'cust-1',
            provider: 'GOOGLE',
            providerAccountId: 'google-123',
          }),
        }),
      );
    });

    it('should update existing link if same customer', async () => {
      (prisma as any).socialAccount.findUnique.mockResolvedValue({
        id: 'sa-1',
        customerId: 'cust-1',
      });
      (prisma as any).socialAccount.update.mockResolvedValue({ id: 'sa-1' });

      await service.linkSocialAccount('cust-1', 'GOOGLE' as any, profile);

      expect((prisma as any).socialAccount.update).toHaveBeenCalled();
    });

    it('should throw if social account linked to different customer', async () => {
      (prisma as any).socialAccount.findUnique.mockResolvedValue({
        id: 'sa-1',
        customerId: 'other-customer',
      });

      await expect(
        service.linkSocialAccount('cust-1', 'GOOGLE' as any, profile),
      ).rejects.toThrow('already linked to a different customer');
    });
  });

  // ─── findCustomerBySocialAccount ────────────────────────────
  describe('findCustomerBySocialAccount', () => {
    it('should return customerAuth when found', async () => {
      const mockAuth = { id: 'ca-1', customer: { id: 'c-1' } };
      (prisma as any).socialAccount.findUnique.mockResolvedValue({
        customerAuth: mockAuth,
      });

      const result = await service.findCustomerBySocialAccount('GOOGLE' as any, 'google-123');
      expect(result).toEqual(mockAuth);
    });

    it('should return null when not found', async () => {
      (prisma as any).socialAccount.findUnique.mockResolvedValue(null);

      const result = await service.findCustomerBySocialAccount('GOOGLE' as any, 'nonexistent');
      expect(result).toBeNull();
    });
  });
});
