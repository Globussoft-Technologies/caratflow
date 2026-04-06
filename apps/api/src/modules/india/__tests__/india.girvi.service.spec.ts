import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndiaGirviService } from '../india.girvi.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('IndiaGirviService (Unit)', () => {
  let service: IndiaGirviService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).girviLoan = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).girviPayment = {
      create: vi.fn(),
    };
    (mockPrisma as any).girviInterestAccrual = {
      findFirst: vi.fn(),
      create: vi.fn(),
    };
    (mockPrisma as any).girviAuction = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).kycVerification = {
      findMany: vi.fn(),
    };
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    service = new IndiaGirviService(mockPrisma as any);
    resetAllMocks(mockPrisma);
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  const baseLoanInput = {
    customerId: 'cust-1',
    locationId: 'loc-1',
    collateralDescription: '22K Gold Chain 50g',
    metalType: 'GOLD',
    grossWeightMg: 50000,
    netWeightMg: 48000,
    purityFineness: 916,
    appraisedValuePaise: 25000000,
    loanAmountPaise: 20000000,
    interestRate: 1200, // 12% per annum in bps
    interestType: 'SIMPLE',
    disbursedDate: new Date('2025-01-01'),
    dueDate: new Date('2025-07-01'),
  };

  const mockActiveLoan = {
    id: 'loan-1',
    tenantId: TEST_TENANT_ID,
    status: 'ACTIVE',
    loanAmountPaise: 20000000n,
    outstandingPrincipalPaise: 20000000n,
    outstandingInterestPaise: 0n,
    totalPrincipalPaidPaise: 0n,
    totalInterestPaidPaise: 0n,
    interestRate: 1200,
    interestType: 'SIMPLE',
    compoundingPeriod: null,
    disbursedDate: new Date('2025-01-01'),
    dueDate: new Date('2025-07-01'),
  };

  // ─── createLoan ─────────────────────────────────────────────────

  describe('createLoan', () => {
    it('creates a loan with KYC verified customer', async () => {
      (mockPrisma as any).kycVerification.findMany.mockResolvedValue([
        { verificationType: 'AADHAAR', verificationStatus: 'VERIFIED' },
      ]);
      (mockPrisma as any).girviLoan.count.mockResolvedValue(0);
      (mockPrisma as any).girviLoan.create.mockResolvedValue({
        id: 'loan-1',
        loanNumber: 'GRV-202501-0001',
        status: 'ACTIVE',
        aadhaarVerified: true,
        panVerified: false,
        customer: {},
        location: {},
      });

      const result = await service.createLoan(TEST_TENANT_ID, TEST_USER_ID, baseLoanInput as any);
      expect(result.status).toBe('ACTIVE');
      expect(result.aadhaarVerified).toBe(true);
    });

    it('rejects loan when no KYC documents verified', async () => {
      (mockPrisma as any).kycVerification.findMany.mockResolvedValue([]);

      await expect(
        service.createLoan(TEST_TENANT_ID, TEST_USER_ID, baseLoanInput as any),
      ).rejects.toThrow('KYC document');
    });

    it('rejects loan amount exceeding appraised value', async () => {
      await expect(
        service.createLoan(TEST_TENANT_ID, TEST_USER_ID, {
          ...baseLoanInput,
          loanAmountPaise: 30000000, // > appraisedValuePaise
        } as any),
      ).rejects.toThrow('cannot exceed appraised value');
    });

    it('rejects net weight exceeding gross weight', async () => {
      await expect(
        service.createLoan(TEST_TENANT_ID, TEST_USER_ID, {
          ...baseLoanInput,
          netWeightMg: 60000, // > grossWeightMg
        } as any),
      ).rejects.toThrow('Net weight cannot exceed gross weight');
    });

    it('rejects due date before disbursed date', async () => {
      await expect(
        service.createLoan(TEST_TENANT_ID, TEST_USER_ID, {
          ...baseLoanInput,
          dueDate: new Date('2024-12-01'), // before disbursedDate
        } as any),
      ).rejects.toThrow('Due date must be after');
    });

    it('rejects compound interest without compounding period', async () => {
      await expect(
        service.createLoan(TEST_TENANT_ID, TEST_USER_ID, {
          ...baseLoanInput,
          interestType: 'COMPOUND',
          // no compoundingPeriod
        } as any),
      ).rejects.toThrow('Compounding period is required');
    });

    it('accepts PAN as KYC instead of Aadhaar', async () => {
      (mockPrisma as any).kycVerification.findMany.mockResolvedValue([
        { verificationType: 'PAN', verificationStatus: 'VERIFIED' },
      ]);
      (mockPrisma as any).girviLoan.count.mockResolvedValue(0);
      (mockPrisma as any).girviLoan.create.mockResolvedValue({
        id: 'loan-1',
        status: 'ACTIVE',
        aadhaarVerified: false,
        panVerified: true,
        customer: {},
        location: {},
      });

      const result = await service.createLoan(TEST_TENANT_ID, TEST_USER_ID, baseLoanInput as any);
      expect(result.panVerified).toBe(true);
    });
  });

  // ─── calculateInterestForPeriod ─────────────────────────────────

  describe('calculateInterestForPeriod', () => {
    it('calculates simple interest correctly', () => {
      // Principal: 2,00,000 Rs (20000000 paise), Rate: 12% (1200 bps), 30 days
      const interest = service.calculateInterestForPeriod(20000000, 1200, 30, 'SIMPLE');
      // dailyRate = 1200 / (365 * 10000) = 0.00003287671
      // interest = 20000000 * 0.00003287671 * 30 = 19726
      expect(interest).toBeGreaterThan(0);
      expect(interest).toBe(Math.round(20000000 * (1200 / (365 * 10000)) * 30));
    });

    it('calculates compound interest (monthly) correctly', () => {
      const interest = service.calculateInterestForPeriod(20000000, 1200, 365, 'COMPOUND', 'MONTHLY');
      // Monthly: periodRate = 1200 / (12 * 10000) = 0.01
      // periods = (365/365) * 12 = 12
      // compoundAmount = 20000000 * (1.01)^12
      const expected = Math.round(20000000 * Math.pow(1.01, 12) - 20000000);
      expect(interest).toBe(expected);
    });

    it('calculates compound interest (quarterly) correctly', () => {
      const interest = service.calculateInterestForPeriod(10000000, 1200, 365, 'COMPOUND', 'QUARTERLY');
      // Quarterly: periodRate = 1200 / (4 * 10000) = 0.03
      // periods = (365/365) * 4 = 4
      const expected = Math.round(10000000 * Math.pow(1.03, 4) - 10000000);
      expect(interest).toBe(expected);
    });

    it('calculates compound interest (yearly) correctly', () => {
      const interest = service.calculateInterestForPeriod(10000000, 1200, 365, 'COMPOUND', 'YEARLY');
      // Yearly: periodRate = 1200 / (1 * 10000) = 0.12
      // periods = (365/365) * 1 = 1
      const expected = Math.round(10000000 * Math.pow(1.12, 1) - 10000000);
      expect(interest).toBe(expected);
    });
  });

  // ─── accrueInterest ─────────────────────────────────────────────

  describe('accrueInterest', () => {
    it('accrues interest on an active loan', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue(mockActiveLoan);
      (mockPrisma as any).girviInterestAccrual.findFirst.mockResolvedValue(null);
      (mockPrisma as any).girviInterestAccrual.create.mockResolvedValue({});
      (mockPrisma as any).girviLoan.update.mockResolvedValue({});

      const result = await service.accrueInterest(TEST_TENANT_ID, 'loan-1');

      expect(result.principalPaise).toBe(20000000);
      expect(result.interestPaise).toBeGreaterThan(0);
      expect(result.outstandingTotalPaise).toBeGreaterThan(20000000);
    });

    it('throws NotFoundException for missing loan', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue(null);

      await expect(
        service.accrueInterest(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── recordPayment ──────────────────────────────────────────────

  describe('recordPayment', () => {
    it('records a regular payment (interest first, then principal)', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue({
        ...mockActiveLoan,
        outstandingInterestPaise: 500000n,
      });
      (mockPrisma as any).girviPayment.create.mockResolvedValue({ id: 'pay-1' });
      (mockPrisma as any).girviLoan.update.mockResolvedValue({});

      const result = await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        girviLoanId: 'loan-1',
        principalPaise: 1000000,
        interestPaise: 500000,
        paymentType: 'REGULAR',
        paymentDate: new Date(),
        method: 'CASH',
      } as any);

      expect(result.id).toBe('pay-1');
    });

    it('closes loan when fully paid', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue({
        ...mockActiveLoan,
        outstandingPrincipalPaise: 1000000n,
        outstandingInterestPaise: 100000n,
        totalPrincipalPaidPaise: 19000000n,
        totalInterestPaidPaise: 400000n,
        loanAmountPaise: 20000000n,
      });
      (mockPrisma as any).girviPayment.create.mockResolvedValue({ id: 'pay-2' });
      (mockPrisma as any).girviLoan.update.mockResolvedValue({});

      await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        girviLoanId: 'loan-1',
        principalPaise: 1000000,
        interestPaise: 100000,
        paymentType: 'REGULAR',
        paymentDate: new Date(),
        method: 'BANK_TRANSFER',
      } as any);

      expect((mockPrisma as any).girviLoan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CLOSED' }),
        }),
      );
    });

    it('rejects closure payment that does not cover full outstanding', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue({
        ...mockActiveLoan,
        outstandingPrincipalPaise: 5000000n,
        outstandingInterestPaise: 500000n,
      });

      await expect(
        service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
          girviLoanId: 'loan-1',
          principalPaise: 1000000,
          interestPaise: 100000,
          paymentType: 'CLOSURE',
          paymentDate: new Date(),
          method: 'CASH',
        } as any),
      ).rejects.toThrow('Closure payment must cover full outstanding');
    });

    it('sets PARTIALLY_PAID status on partial payment', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue(mockActiveLoan);
      (mockPrisma as any).girviPayment.create.mockResolvedValue({ id: 'pay-3' });
      (mockPrisma as any).girviLoan.update.mockResolvedValue({});

      await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        girviLoanId: 'loan-1',
        principalPaise: 5000000,
        interestPaise: 0,
        paymentType: 'REGULAR',
        paymentDate: new Date(),
        method: 'CASH',
      } as any);

      expect((mockPrisma as any).girviLoan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PARTIALLY_PAID' }),
        }),
      );
    });

    it('throws NotFoundException for missing loan', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue(null);

      await expect(
        service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
          girviLoanId: 'nonexistent',
          principalPaise: 1000,
          interestPaise: 0,
          paymentType: 'REGULAR',
          paymentDate: new Date(),
          method: 'CASH',
        } as any),
      ).rejects.toThrow('not found');
    });
  });

  // ─── closeLoan ──────────────────────────────────────────────────

  describe('closeLoan', () => {
    it('closes a fully paid loan', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue({
        ...mockActiveLoan,
        outstandingPrincipalPaise: 0n,
        outstandingInterestPaise: 0n,
      });
      (mockPrisma as any).girviLoan.update.mockResolvedValue({
        ...mockActiveLoan,
        status: 'CLOSED',
        customer: {},
      });

      const result = await service.closeLoan(TEST_TENANT_ID, TEST_USER_ID, 'loan-1');
      expect(result.status).toBe('CLOSED');
    });

    it('rejects closing loan with outstanding balance', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue(mockActiveLoan);

      await expect(
        service.closeLoan(TEST_TENANT_ID, TEST_USER_ID, 'loan-1'),
      ).rejects.toThrow('outstanding balance');
    });
  });

  // ─── markDefaulted ──────────────────────────────────────────────

  describe('markDefaulted', () => {
    it('marks an active loan as defaulted', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue(mockActiveLoan);
      (mockPrisma as any).girviLoan.update.mockResolvedValue({
        ...mockActiveLoan,
        status: 'DEFAULTED',
        customer: {},
      });

      const result = await service.markDefaulted(TEST_TENANT_ID, TEST_USER_ID, 'loan-1');
      expect(result.status).toBe('DEFAULTED');
    });
  });

  // ─── processOverdueLoans ────────────────────────────────────────

  describe('processOverdueLoans', () => {
    it('defaults overdue loans past grace period', async () => {
      (mockPrisma as any).girviLoan.findMany.mockResolvedValue([
        { id: 'loan-1' },
        { id: 'loan-2' },
      ]);
      (mockPrisma as any).girviLoan.update.mockResolvedValue({});

      const count = await service.processOverdueLoans(TEST_TENANT_ID);
      expect(count).toBe(2);
    });
  });

  // ─── scheduleAuction ────────────────────────────────────────────

  describe('scheduleAuction', () => {
    it('schedules an auction for a defaulted loan', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue({
        ...mockActiveLoan,
        status: 'DEFAULTED',
      });
      (mockPrisma as any).girviAuction.create.mockResolvedValue({
        id: 'auction-1',
        status: 'SCHEDULED',
        auctionDate: new Date('2025-08-01'),
        girviLoan: { customer: {} },
      });

      const result = await service.scheduleAuction(TEST_TENANT_ID, TEST_USER_ID, {
        girviLoanId: 'loan-1',
        auctionDate: new Date('2025-08-01'),
        reservePricePaise: 18000000,
      } as any);

      expect(result.status).toBe('SCHEDULED');
    });

    it('throws NotFoundException for non-defaulted loan', async () => {
      (mockPrisma as any).girviLoan.findFirst.mockResolvedValue(null);

      await expect(
        service.scheduleAuction(TEST_TENANT_ID, TEST_USER_ID, {
          girviLoanId: 'loan-1',
          auctionDate: new Date(),
          reservePricePaise: 1000,
        } as any),
      ).rejects.toThrow('not found');
    });
  });

  // ─── recordAuctionResult ────────────────────────────────────────

  describe('recordAuctionResult', () => {
    it('records auction result and marks loan as AUCTIONED', async () => {
      (mockPrisma as any).girviAuction.findFirst.mockResolvedValue({
        id: 'auction-1',
        girviLoanId: 'loan-1',
        status: 'SCHEDULED',
      });
      (mockPrisma as any).girviAuction.update.mockResolvedValue({
        id: 'auction-1',
        status: 'COMPLETED',
        soldPricePaise: 19000000n,
      });
      (mockPrisma as any).girviLoan.update.mockResolvedValue({});

      const result = await service.recordAuctionResult(TEST_TENANT_ID, TEST_USER_ID, {
        auctionId: 'auction-1',
        soldPricePaise: 19000000,
        buyerName: 'Auction Buyer',
      } as any);

      expect(result.status).toBe('COMPLETED');
      expect((mockPrisma as any).girviLoan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'AUCTIONED' }),
        }),
      );
    });
  });

  // ─── getDashboard ───────────────────────────────────────────────

  describe('getDashboard', () => {
    it('returns girvi dashboard stats', async () => {
      (mockPrisma as any).girviLoan.count
        .mockResolvedValueOnce(10) // active
        .mockResolvedValueOnce(2); // overdue
      (mockPrisma as any).girviAuction.count.mockResolvedValue(1);
      (mockPrisma as any).girviLoan.findMany
        .mockResolvedValueOnce([
          { outstandingPrincipalPaise: 10000000n, outstandingInterestPaise: 500000n },
          { outstandingPrincipalPaise: 5000000n, outstandingInterestPaise: 200000n },
        ])
        .mockResolvedValueOnce([]); // recent loans

      const result = await service.getDashboard(TEST_TENANT_ID);

      expect(result.activeLoans).toBe(10);
      expect(result.overdueLoans).toBe(2);
      expect(result.upcomingAuctions).toBe(1);
      expect(result.totalPrincipalOutstandingPaise).toBe(15000000);
      expect(result.totalInterestAccruedPaise).toBe(700000);
    });
  });
});
