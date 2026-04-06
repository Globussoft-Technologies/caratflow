import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndiaKycService } from '../india.kyc.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

// Mock validation utils
vi.mock('@caratflow/utils', () => ({
  isValidAadhaar: (num: string) => /^\d{12}$/.test(num),
  isValidPan: (pan: string) => /^[A-Z]{5}\d{4}[A-Z]$/.test(pan),
}));

describe('IndiaKycService (Unit)', () => {
  let service: IndiaKycService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).kycVerification = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    };
    service = new IndiaKycService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── recordDocument ─────────────────────────────────────────────

  describe('recordDocument', () => {
    it('records a valid Aadhaar document', async () => {
      (mockPrisma as any).kycVerification.findFirst.mockResolvedValue(null);
      (mockPrisma as any).kycVerification.create.mockResolvedValue({
        id: 'kyc-1',
        verificationType: 'AADHAAR',
        documentNumber: '123456789012',
        verificationStatus: 'PENDING',
        customer: {},
      });

      const result = await service.recordDocument(TEST_TENANT_ID, TEST_USER_ID, {
        customerId: 'cust-1',
        verificationType: 'AADHAAR',
        documentNumber: '123456789012',
      } as any);

      expect(result.verificationType).toBe('AADHAAR');
      expect(result.verificationStatus).toBe('PENDING');
    });

    it('rejects invalid Aadhaar number format', async () => {
      await expect(
        service.recordDocument(TEST_TENANT_ID, TEST_USER_ID, {
          customerId: 'cust-1',
          verificationType: 'AADHAAR',
          documentNumber: '12345', // too short
        } as any),
      ).rejects.toThrow('Invalid Aadhaar');
    });

    it('records a valid PAN document', async () => {
      (mockPrisma as any).kycVerification.findFirst.mockResolvedValue(null);
      (mockPrisma as any).kycVerification.create.mockResolvedValue({
        id: 'kyc-2',
        verificationType: 'PAN',
        documentNumber: 'ABCDE1234F',
        verificationStatus: 'PENDING',
        customer: {},
      });

      const result = await service.recordDocument(TEST_TENANT_ID, TEST_USER_ID, {
        customerId: 'cust-1',
        verificationType: 'PAN',
        documentNumber: 'ABCDE1234F',
      } as any);

      expect(result.verificationType).toBe('PAN');
    });

    it('rejects invalid PAN format', async () => {
      await expect(
        service.recordDocument(TEST_TENANT_ID, TEST_USER_ID, {
          customerId: 'cust-1',
          verificationType: 'PAN',
          documentNumber: 'ABC123', // invalid
        } as any),
      ).rejects.toThrow('Invalid PAN');
    });

    it('rejects re-recording already verified document', async () => {
      (mockPrisma as any).kycVerification.findFirst.mockResolvedValue({
        id: 'kyc-1',
        verificationStatus: 'VERIFIED',
      });

      await expect(
        service.recordDocument(TEST_TENANT_ID, TEST_USER_ID, {
          customerId: 'cust-1',
          verificationType: 'AADHAAR',
          documentNumber: '123456789012',
        } as any),
      ).rejects.toThrow('already verified');
    });

    it('updates existing PENDING verification instead of creating new', async () => {
      (mockPrisma as any).kycVerification.findFirst.mockResolvedValue({
        id: 'kyc-1',
        verificationStatus: 'PENDING',
      });
      (mockPrisma as any).kycVerification.update.mockResolvedValue({
        id: 'kyc-1',
        documentNumber: '999888777666',
        verificationStatus: 'PENDING',
        customer: {},
      });

      const result = await service.recordDocument(TEST_TENANT_ID, TEST_USER_ID, {
        customerId: 'cust-1',
        verificationType: 'AADHAAR',
        documentNumber: '999888777666',
      } as any);

      expect((mockPrisma as any).kycVerification.update).toHaveBeenCalled();
      expect((mockPrisma as any).kycVerification.create).not.toHaveBeenCalled();
    });

    it('validates passport format', async () => {
      await expect(
        service.recordDocument(TEST_TENANT_ID, TEST_USER_ID, {
          customerId: 'cust-1',
          verificationType: 'PASSPORT',
          documentNumber: '123', // invalid
        } as any),
      ).rejects.toThrow('Invalid passport');
    });

    it('accepts valid passport format', async () => {
      (mockPrisma as any).kycVerification.findFirst.mockResolvedValue(null);
      (mockPrisma as any).kycVerification.create.mockResolvedValue({
        id: 'kyc-3',
        verificationType: 'PASSPORT',
        documentNumber: 'A1234567',
        verificationStatus: 'PENDING',
        customer: {},
      });

      const result = await service.recordDocument(TEST_TENANT_ID, TEST_USER_ID, {
        customerId: 'cust-1',
        verificationType: 'PASSPORT',
        documentNumber: 'A1234567',
      } as any);

      expect(result.verificationType).toBe('PASSPORT');
    });

    it('validates voter ID format', async () => {
      await expect(
        service.recordDocument(TEST_TENANT_ID, TEST_USER_ID, {
          customerId: 'cust-1',
          verificationType: 'VOTER_ID',
          documentNumber: 'AB123', // invalid
        } as any),
      ).rejects.toThrow('Invalid voter ID');
    });
  });

  // ─── verifyDocument ─────────────────────────────────────────────

  describe('verifyDocument', () => {
    it('verifies a pending document', async () => {
      (mockPrisma as any).kycVerification.findFirst.mockResolvedValue({
        id: 'kyc-1',
        verificationType: 'AADHAAR',
        verificationStatus: 'PENDING',
      });
      (mockPrisma as any).kycVerification.update.mockResolvedValue({
        id: 'kyc-1',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        customer: {},
      });

      const result = await service.verifyDocument(TEST_TENANT_ID, TEST_USER_ID, {
        verificationId: 'kyc-1',
        status: 'VERIFIED',
      });

      expect(result.verificationStatus).toBe('VERIFIED');
    });

    it('sets validUntil for non-lifetime documents', async () => {
      (mockPrisma as any).kycVerification.findFirst.mockResolvedValue({
        id: 'kyc-1',
        verificationType: 'PASSPORT',
        verificationStatus: 'PENDING',
      });
      (mockPrisma as any).kycVerification.update.mockResolvedValue({
        id: 'kyc-1',
        verificationStatus: 'VERIFIED',
        customer: {},
      });

      await service.verifyDocument(TEST_TENANT_ID, TEST_USER_ID, {
        verificationId: 'kyc-1',
        status: 'VERIFIED',
      });

      expect((mockPrisma as any).kycVerification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            validUntil: expect.any(Date),
          }),
        }),
      );
    });

    it('throws NotFoundException for missing verification', async () => {
      (mockPrisma as any).kycVerification.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyDocument(TEST_TENANT_ID, TEST_USER_ID, {
          verificationId: 'nonexistent',
          status: 'VERIFIED',
        }),
      ).rejects.toThrow('not found');
    });
  });

  // ─── getCustomerKycStatus ───────────────────────────────────────

  describe('getCustomerKycStatus', () => {
    it('returns complete KYC status when both Aadhaar and PAN verified', async () => {
      (mockPrisma as any).kycVerification.findMany.mockResolvedValue([
        { id: 'k1', verificationType: 'AADHAAR', documentNumber: '123456789012', verificationStatus: 'VERIFIED', verifiedAt: new Date(), validUntil: null },
        { id: 'k2', verificationType: 'PAN', documentNumber: 'ABCDE1234F', verificationStatus: 'VERIFIED', verifiedAt: new Date(), validUntil: null },
      ]);

      const result = await service.getCustomerKycStatus(TEST_TENANT_ID, 'cust-1');

      expect(result.isKycComplete).toBe(true);
      expect(result.isAadhaarVerified).toBe(true);
      expect(result.isPanVerified).toBe(true);
    });

    it('returns incomplete when only Aadhaar verified', async () => {
      (mockPrisma as any).kycVerification.findMany.mockResolvedValue([
        { id: 'k1', verificationType: 'AADHAAR', documentNumber: '123456789012', verificationStatus: 'VERIFIED', verifiedAt: new Date(), validUntil: null },
      ]);

      const result = await service.getCustomerKycStatus(TEST_TENANT_ID, 'cust-1');

      expect(result.isKycComplete).toBe(false);
      expect(result.isAadhaarVerified).toBe(true);
      expect(result.isPanVerified).toBe(false);
    });

    it('masks Aadhaar number in response', async () => {
      (mockPrisma as any).kycVerification.findMany.mockResolvedValue([
        { id: 'k1', verificationType: 'AADHAAR', documentNumber: '123456789012', verificationStatus: 'VERIFIED', verifiedAt: null, validUntil: null },
      ]);

      const result = await service.getCustomerKycStatus(TEST_TENANT_ID, 'cust-1');

      expect(result.verifications[0].documentNumber).toBe('XXXX-XXXX-9012');
    });

    it('masks PAN number in response', async () => {
      (mockPrisma as any).kycVerification.findMany.mockResolvedValue([
        { id: 'k1', verificationType: 'PAN', documentNumber: 'ABCDE1234F', verificationStatus: 'VERIFIED', verifiedAt: null, validUntil: null },
      ]);

      const result = await service.getCustomerKycStatus(TEST_TENANT_ID, 'cust-1');

      expect(result.verifications[0].documentNumber).toBe('ABXXXXX34F');
    });
  });

  // ─── isKycComplete ──────────────────────────────────────────────

  describe('isKycComplete', () => {
    it('returns true when both documents verified', async () => {
      (mockPrisma as any).kycVerification.findMany.mockResolvedValue([
        { id: 'k1', verificationType: 'AADHAAR', documentNumber: '123456789012', verificationStatus: 'VERIFIED', verifiedAt: new Date(), validUntil: null },
        { id: 'k2', verificationType: 'PAN', documentNumber: 'ABCDE1234F', verificationStatus: 'VERIFIED', verifiedAt: new Date(), validUntil: null },
      ]);

      const result = await service.isKycComplete(TEST_TENANT_ID, 'cust-1');
      expect(result).toBe(true);
    });
  });

  // ─── getExpiringVerifications ───────────────────────────────────

  describe('getExpiringVerifications', () => {
    it('returns verifications expiring within given days', async () => {
      (mockPrisma as any).kycVerification.findMany.mockResolvedValue([
        { id: 'k1', verificationType: 'PASSPORT', customer: {} },
      ]);

      const result = await service.getExpiringVerifications(TEST_TENANT_ID, 60);
      expect(result).toHaveLength(1);
    });
  });

  // ─── markExpiredVerifications ───────────────────────────────────

  describe('markExpiredVerifications', () => {
    it('marks expired verifications', async () => {
      (mockPrisma as any).kycVerification.updateMany.mockResolvedValue({ count: 3 });

      const count = await service.markExpiredVerifications(TEST_TENANT_ID);
      expect(count).toBe(3);
    });
  });

  // ─── getPendingCount ────────────────────────────────────────────

  describe('getPendingCount', () => {
    it('returns count of pending verifications', async () => {
      (mockPrisma as any).kycVerification.count.mockResolvedValue(5);

      const result = await service.getPendingCount(TEST_TENANT_ID);
      expect(result).toBe(5);
    });
  });
});
