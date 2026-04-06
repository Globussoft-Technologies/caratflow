import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OtpService } from '../auth.otp.service';
import { createMockPrismaService, resetMocks } from '../../__tests__/mocks';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2, 10)),
}));

describe('OtpService', () => {
  let service: OtpService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    service = new OtpService(prisma as never);
    resetMocks(prisma);
  });

  // ─── Generate OTP ──────────────────────────────────────────────

  describe('generateOtp', () => {
    it('should generate a 6-digit OTP', async () => {
      prisma.otpVerification.updateMany.mockResolvedValue({ count: 0 });
      prisma.otpVerification.create.mockResolvedValue({ id: 'otp-id' });

      const result = await service.generateOtp('+919876543210', 'LOGIN' as never);

      expect(result.message).toBe('OTP sent successfully');
      // In dev mode, OTP is returned
      if (result.otp) {
        expect(result.otp).toMatch(/^\d{6}$/);
        const num = parseInt(result.otp, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it('should invalidate previous unexpired OTPs', async () => {
      prisma.otpVerification.updateMany.mockResolvedValue({ count: 1 });
      prisma.otpVerification.create.mockResolvedValue({ id: 'otp-id' });

      await service.generateOtp('+919876543210', 'LOGIN' as never);

      expect(prisma.otpVerification.updateMany).toHaveBeenCalledWith({
        where: {
          identifier: '+919876543210',
          purpose: 'LOGIN',
          verifiedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: { expiresAt: expect.any(Date) },
      });
    });

    it('should create OTP record with 5-minute expiry', async () => {
      prisma.otpVerification.updateMany.mockResolvedValue({ count: 0 });
      prisma.otpVerification.create.mockResolvedValue({ id: 'otp-id' });

      await service.generateOtp('user@example.com', 'REGISTRATION' as never);

      expect(prisma.otpVerification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          identifier: 'user@example.com',
          purpose: 'REGISTRATION',
          expiresAt: expect.any(Date),
        }),
      });

      const createCall = prisma.otpVerification.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const now = new Date();
      // Should be approximately 5 minutes in the future
      const diffMs = expiresAt.getTime() - now.getTime();
      expect(diffMs).toBeGreaterThan(4 * 60 * 1000);
      expect(diffMs).toBeLessThan(6 * 60 * 1000);
    });

    it('should return OTP in non-production environment', async () => {
      prisma.otpVerification.updateMany.mockResolvedValue({ count: 0 });
      prisma.otpVerification.create.mockResolvedValue({ id: 'otp-id' });

      const result = await service.generateOtp('+919876543210', 'LOGIN' as never);

      // NODE_ENV is set to 'test' in setup
      expect(result.otp).toBeDefined();
    });
  });

  // ─── Verify OTP ────────────────────────────────────────────────

  describe('verifyOtp', () => {
    it('should succeed with correct OTP code', async () => {
      prisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-id',
        identifier: '+919876543210',
        otpCode: '123456',
        purpose: 'LOGIN',
        attempts: 0,
        maxAttempts: 3,
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 300000),
      });
      prisma.otpVerification.update.mockResolvedValue({});

      const result = await service.verifyOtp('+919876543210', '123456', 'LOGIN' as never);

      expect(result).toBe(true);
    });

    it('should mark OTP as verified after success', async () => {
      prisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-id',
        otpCode: '123456',
        attempts: 0,
        maxAttempts: 3,
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 300000),
      });
      prisma.otpVerification.update.mockResolvedValue({});

      await service.verifyOtp('+919876543210', '123456', 'LOGIN' as never);

      // Second update call should mark as verified
      const updateCalls = prisma.otpVerification.update.mock.calls;
      const verifyCall = updateCalls.find(
        (call: Array<Record<string, unknown>>) => (call[0].data as Record<string, unknown>).verifiedAt !== undefined,
      );
      expect(verifyCall).toBeDefined();
    });

    it('should throw for wrong OTP code and increment attempts', async () => {
      prisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-id',
        otpCode: '123456',
        attempts: 0,
        maxAttempts: 3,
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 300000),
      });
      prisma.otpVerification.update.mockResolvedValue({});

      await expect(
        service.verifyOtp('+919876543210', '999999', 'LOGIN' as never),
      ).rejects.toThrow(BadRequestException);

      // Should increment attempts
      expect(prisma.otpVerification.update).toHaveBeenCalledWith({
        where: { id: 'otp-id' },
        data: { attempts: { increment: 1 } },
      });
    });

    it('should throw when no valid OTP found (expired)', async () => {
      prisma.otpVerification.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyOtp('+919876543210', '123456', 'LOGIN' as never),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verifyOtp('+919876543210', '123456', 'LOGIN' as never),
      ).rejects.toThrow('No valid OTP found');
    });

    it('should throw after max attempts exceeded', async () => {
      prisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-id',
        otpCode: '123456',
        attempts: 3,
        maxAttempts: 3,
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 300000),
      });

      await expect(
        service.verifyOtp('+919876543210', '123456', 'LOGIN' as never),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verifyOtp('+919876543210', '123456', 'LOGIN' as never),
      ).rejects.toThrow('Maximum verification attempts exceeded');
    });

    it('should show remaining attempts in error message', async () => {
      prisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-id',
        otpCode: '123456',
        attempts: 1,
        maxAttempts: 3,
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 300000),
      });
      prisma.otpVerification.update.mockResolvedValue({});

      await expect(
        service.verifyOtp('+919876543210', '000000', 'LOGIN' as never),
      ).rejects.toThrow(/1 attempt\(s\) remaining/);
    });
  });

  // ─── Cleanup ───────────────────────────────────────────────────

  describe('cleanupExpiredOtps', () => {
    it('should delete expired and verified OTP records', async () => {
      prisma.otpVerification.deleteMany.mockResolvedValue({ count: 5 });

      const count = await service.cleanupExpiredOtps();

      expect(count).toBe(5);
      expect(prisma.otpVerification.deleteMany).toHaveBeenCalled();
    });
  });
});
