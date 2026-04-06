import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmlService } from '../aml.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('AmlService', () => {
  let service: AmlService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const CUSTOMER_ID = 'cust-1';

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();

    (mockPrisma as any).amlRule = {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    };
    (mockPrisma as any).amlAlert = {
      create: vi.fn().mockResolvedValue({ id: 'alert-1' }),
      count: vi.fn().mockResolvedValue(0),
    };
    (mockPrisma as any).amlCustomerRisk = {
      findFirst: vi.fn(),
    };

    service = new AmlService(mockPrisma as any, mockEventBus as any);
    // Note: resetAllMocks is NOT called here because we set up mocks inline per test.
    // The beforeEach already creates fresh mocks via createMockPrismaService().
  });

  // ─── Amount Limit Rule ─────────────────────────────────────

  describe('TRANSACTION_AMOUNT_LIMIT rule', () => {
    it('triggers alert when transaction exceeds threshold', async () => {
      (mockPrisma as any).amlRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          tenantId: TEST_TENANT_ID,
          ruleName: 'High Value Limit',
          ruleType: 'TRANSACTION_AMOUNT_LIMIT',
          parameters: { maxAmountPaise: 50000000 }, // Rs 5 lakh
          severity: 'HIGH',
          isActive: true,
        },
      ]);

      const result = await service.evaluateTransaction(
        TEST_TENANT_ID,
        CUSTOMER_ID,
        BigInt(60000000), // Rs 6 lakh (exceeds limit)
        'PURCHASE',
      );

      expect(result.passed).toBe(false);
      expect(result.alertsCreated).toBe(1);
      expect(result.alerts[0].alertType).toBe('HIGH_VALUE');
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('no alert for amount below threshold', async () => {
      (mockPrisma as any).amlRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          tenantId: TEST_TENANT_ID,
          ruleName: 'High Value Limit',
          ruleType: 'TRANSACTION_AMOUNT_LIMIT',
          parameters: { maxAmountPaise: 50000000 },
          severity: 'HIGH',
          isActive: true,
        },
      ]);

      const result = await service.evaluateTransaction(
        TEST_TENANT_ID,
        CUSTOMER_ID,
        BigInt(30000000), // Rs 3 lakh (below limit)
        'PURCHASE',
      );

      expect(result.passed).toBe(true);
      expect(result.alertsCreated).toBe(0);
    });
  });

  // ─── Frequency Rule ────────────────────────────────────────

  describe('FREQUENCY_LIMIT rule', () => {
    it('triggers alert when transaction count exceeds limit in period', async () => {
      (mockPrisma as any).amlRule.findMany.mockResolvedValue([
        {
          id: 'rule-freq',
          tenantId: TEST_TENANT_ID,
          ruleName: 'Frequency Check',
          ruleType: 'FREQUENCY_LIMIT',
          parameters: { maxCount: 5, period: '24h' },
          severity: 'MEDIUM',
          isActive: true,
        },
      ]);
      (mockPrisma as any).amlAlert.count.mockResolvedValue(6); // exceeded

      const result = await service.evaluateTransaction(
        TEST_TENANT_ID,
        CUSTOMER_ID,
        BigInt(1000000),
        'PURCHASE',
      );

      expect(result.passed).toBe(false);
      expect(result.alerts[0].alertType).toBe('RAPID_TRANSACTIONS');
    });

    it('no alert when count is below limit', async () => {
      (mockPrisma as any).amlRule.findMany.mockResolvedValue([
        {
          id: 'rule-freq',
          tenantId: TEST_TENANT_ID,
          ruleName: 'Frequency Check',
          ruleType: 'FREQUENCY_LIMIT',
          parameters: { maxCount: 10, period: '24h' },
          severity: 'MEDIUM',
          isActive: true,
        },
      ]);
      (mockPrisma as any).amlAlert.count.mockResolvedValue(3);

      const result = await service.evaluateTransaction(
        TEST_TENANT_ID,
        CUSTOMER_ID,
        BigInt(1000000),
        'PURCHASE',
      );

      expect(result.passed).toBe(true);
    });
  });

  // ─── Structuring Detection ─────────────────────────────────

  describe('STRUCTURING rule', () => {
    it('flags transaction just below reporting threshold', async () => {
      (mockPrisma as any).amlRule.findMany.mockResolvedValue([
        {
          id: 'rule-struct',
          tenantId: TEST_TENANT_ID,
          ruleName: 'Structuring Detection',
          ruleType: 'STRUCTURING',
          parameters: {
            structuringThresholdPaise: 50000000, // Rs 5 lakh
            structuringWindowHours: 24,
          },
          severity: 'HIGH',
          isActive: true,
        },
      ]);
      (mockPrisma as any).amlAlert.count.mockResolvedValue(0);

      // Transaction at Rs 4.6 lakh (within 90-100% of threshold)
      const result = await service.evaluateTransaction(
        TEST_TENANT_ID,
        CUSTOMER_ID,
        BigInt(46000000), // 92% of threshold
        'PURCHASE',
      );

      expect(result.passed).toBe(false);
      expect(result.alerts[0].alertType).toBe('STRUCTURING');
    });

    it('flags repeated near-threshold transactions', async () => {
      (mockPrisma as any).amlRule.findMany.mockResolvedValue([
        {
          id: 'rule-struct',
          tenantId: TEST_TENANT_ID,
          ruleName: 'Structuring Detection',
          ruleType: 'STRUCTURING',
          parameters: {
            structuringThresholdPaise: 50000000,
            structuringWindowHours: 24,
          },
          severity: 'CRITICAL',
          isActive: true,
        },
      ]);
      // Already 1 structuring alert in window
      (mockPrisma as any).amlAlert.count.mockResolvedValue(1);

      const result = await service.evaluateTransaction(
        TEST_TENANT_ID,
        CUSTOMER_ID,
        BigInt(47000000), // near threshold again
        'PURCHASE',
      );

      expect(result.passed).toBe(false);
      expect(result.alerts[0].description).toContain('Multiple near-threshold');
    });

    it('does not flag transaction well below threshold', async () => {
      (mockPrisma as any).amlRule.findMany.mockResolvedValue([
        {
          id: 'rule-struct',
          tenantId: TEST_TENANT_ID,
          ruleName: 'Structuring Detection',
          ruleType: 'STRUCTURING',
          parameters: {
            structuringThresholdPaise: 50000000,
            structuringWindowHours: 24,
          },
          severity: 'HIGH',
          isActive: true,
        },
      ]);

      // Rs 1 lakh -- well below 90% of Rs 5 lakh
      const result = await service.evaluateTransaction(
        TEST_TENANT_ID,
        CUSTOMER_ID,
        BigInt(10000000),
        'PURCHASE',
      );

      expect(result.passed).toBe(true);
    });
  });

  // ─── Normal Transactions ───────────────────────────────────

  describe('normal transactions', () => {
    it('passes with no active rules', async () => {
      (mockPrisma as any).amlRule.findMany.mockResolvedValue([]);

      const result = await service.evaluateTransaction(
        TEST_TENANT_ID,
        CUSTOMER_ID,
        BigInt(1000000),
        'PURCHASE',
      );

      expect(result.passed).toBe(true);
      expect(result.alertsCreated).toBe(0);
    });

    it('evaluates multiple rules and reports all triggered', async () => {
      (mockPrisma as any).amlRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          tenantId: TEST_TENANT_ID,
          ruleName: 'Amount Limit',
          ruleType: 'TRANSACTION_AMOUNT_LIMIT',
          parameters: { maxAmountPaise: 50000000 },
          severity: 'HIGH',
          isActive: true,
        },
        {
          id: 'rule-2',
          tenantId: TEST_TENANT_ID,
          ruleName: 'High Value',
          ruleType: 'HIGH_VALUE_ALERT',
          parameters: { maxAmountPaise: 30000000 },
          severity: 'MEDIUM',
          isActive: true,
        },
      ]);

      const result = await service.evaluateTransaction(
        TEST_TENANT_ID,
        CUSTOMER_ID,
        BigInt(60000000), // exceeds both thresholds
        'PURCHASE',
      );

      expect(result.alertsCreated).toBe(2);
    });
  });
});
