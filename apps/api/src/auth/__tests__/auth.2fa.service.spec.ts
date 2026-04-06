import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TwoFactorAuthService } from '../auth.2fa.service';
import { createMockPrismaService, createMockCustomerAuth, resetMocks } from '../../__tests__/mocks';

describe('TwoFactorAuthService', () => {
  let service: TwoFactorAuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    service = new TwoFactorAuthService(prisma as never);
  });

  // ─── enable2FA ─────────────────────────────────────────────
  describe('enable2FA', () => {
    it('should generate secret, otpAuthUrl, and qrCodeDataUrl', async () => {
      const auth = createMockCustomerAuth({ twoFactorEnabled: false, twoFactorSecret: null });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);
      prisma.customerAuth.update.mockResolvedValue(auth as any);

      const result = await service.enable2FA(auth.id);

      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBe(20);
      expect(result.otpAuthUrl).toContain('otpauth://totp/');
      expect(result.otpAuthUrl).toContain(result.secret);
      expect(result.qrCodeDataUrl).toContain('data:image/svg+xml;base64,');
    });

    it('should store secret via prisma update', async () => {
      const auth = createMockCustomerAuth({ twoFactorEnabled: false, twoFactorSecret: null });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);
      prisma.customerAuth.update.mockResolvedValue(auth as any);

      await service.enable2FA(auth.id);

      expect(prisma.customerAuth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: auth.id },
          data: expect.objectContaining({ twoFactorSecret: expect.any(String) }),
        }),
      );
    });

    it('should throw NotFoundException if customerAuth not found', async () => {
      prisma.customerAuth.findUnique.mockResolvedValue(null);
      await expect(service.enable2FA('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if 2FA already enabled', async () => {
      const auth = createMockCustomerAuth({ twoFactorEnabled: true, twoFactorSecret: 'EXISTING' });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);

      await expect(service.enable2FA(auth.id)).rejects.toThrow(BadRequestException);
    });

    it('should include issuer CaratFlow in otpAuthUrl', async () => {
      const auth = createMockCustomerAuth({ twoFactorEnabled: false, twoFactorSecret: null });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);
      prisma.customerAuth.update.mockResolvedValue(auth as any);

      const result = await service.enable2FA(auth.id);
      expect(result.otpAuthUrl).toContain('CaratFlow');
    });
  });

  // ─── verify2FA ─────────────────────────────────────────────
  describe('verify2FA', () => {
    it('should throw NotFoundException if customerAuth not found', async () => {
      prisma.customerAuth.findUnique.mockResolvedValue(null);
      await expect(service.verify2FA('nonexistent', '123456')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if 2FA not set up (no secret)', async () => {
      const auth = createMockCustomerAuth({ twoFactorSecret: null });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);

      await expect(service.verify2FA(auth.id, '123456')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for wrong code (placeholder always returns 000000)', async () => {
      const auth = createMockCustomerAuth({ twoFactorSecret: 'ABCDEFGHIJKLMNOPQRST', twoFactorEnabled: false });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);

      await expect(service.verify2FA(auth.id, '999999')).rejects.toThrow('Invalid two-factor authentication code');
    });

    it('should accept code 000000 (placeholder TOTP) and enable 2FA on first verification', async () => {
      const auth = createMockCustomerAuth({ twoFactorSecret: 'ABCDEFGHIJKLMNOPQRST', twoFactorEnabled: false });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);
      prisma.customerAuth.update.mockResolvedValue({ ...auth, twoFactorEnabled: true } as any);

      const result = await service.verify2FA(auth.id, '000000');
      expect(result).toBe(true);
      expect(prisma.customerAuth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { twoFactorEnabled: true },
        }),
      );
    });

    it('should not re-enable if already enabled', async () => {
      const auth = createMockCustomerAuth({ twoFactorSecret: 'ABCDEFGHIJKLMNOPQRST', twoFactorEnabled: true });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);

      const result = await service.verify2FA(auth.id, '000000');
      expect(result).toBe(true);
      expect(prisma.customerAuth.update).not.toHaveBeenCalled();
    });
  });

  // ─── disable2FA ────────────────────────────────────────────
  describe('disable2FA', () => {
    it('should throw NotFoundException if customerAuth not found', async () => {
      prisma.customerAuth.findUnique.mockResolvedValue(null);
      await expect(service.disable2FA('nonexistent', '000000')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if 2FA not enabled', async () => {
      const auth = createMockCustomerAuth({ twoFactorEnabled: false, twoFactorSecret: null });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);

      await expect(service.disable2FA(auth.id, '000000')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid code', async () => {
      const auth = createMockCustomerAuth({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);

      await expect(service.disable2FA(auth.id, '999999')).rejects.toThrow('Invalid two-factor authentication code');
    });

    it('should clear secret and disable on valid code', async () => {
      const auth = createMockCustomerAuth({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);
      prisma.customerAuth.update.mockResolvedValue(auth as any);

      await service.disable2FA(auth.id, '000000');

      expect(prisma.customerAuth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { twoFactorEnabled: false, twoFactorSecret: null },
        }),
      );
    });
  });

  // ─── validate2FAForTransaction ─────────────────────────────
  describe('validate2FAForTransaction', () => {
    it('should throw NotFoundException if customerAuth not found', async () => {
      prisma.customerAuth.findUnique.mockResolvedValue(null);
      await expect(service.validate2FAForTransaction('nonexistent', '000000')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if 2FA not enabled', async () => {
      const auth = createMockCustomerAuth({ twoFactorEnabled: false, twoFactorSecret: null });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);

      await expect(service.validate2FAForTransaction(auth.id, '000000')).rejects.toThrow(BadRequestException);
    });

    it('should return true on valid code without changing state', async () => {
      const auth = createMockCustomerAuth({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' });
      prisma.customerAuth.findUnique.mockResolvedValue(auth as any);

      const result = await service.validate2FAForTransaction(auth.id, '000000');
      expect(result).toBe(true);
      expect(prisma.customerAuth.update).not.toHaveBeenCalled();
    });
  });
});
