import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceHuidService } from '../compliance.huid.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

// Mock isValidHuid from utils
vi.mock('@caratflow/utils', () => ({
  isValidHuid: (huid: string) => /^[A-Z0-9]{6}$/.test(huid),
}));

describe('ComplianceHuidService (Unit)', () => {
  let service: ComplianceHuidService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    // Add compliance-specific models
    (mockPrisma as any).huidRecord = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).product = {
      ...mockPrisma.product,
      count: vi.fn(),
      update: vi.fn(),
    };
    service = new ComplianceHuidService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  // ─── register ───────────────────────────────────────────────────

  describe('register', () => {
    const validInput = {
      huidNumber: 'ABC123',
      productId: 'prod-1',
      articleType: 'RING',
      metalType: 'GOLD',
      purityFineness: 916,
      weightMg: 5000,
    };

    it('registers a valid 6-char HUID', async () => {
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', sku: 'GR-001', name: 'Gold Ring' });
      (mockPrisma as any).huidRecord.create.mockResolvedValue({
        id: 'huid-1',
        tenantId: TEST_TENANT_ID,
        productId: 'prod-1',
        huidNumber: 'ABC123',
        weightMg: 5000n,
        status: 'ACTIVE',
        product: { id: 'prod-1', sku: 'GR-001', name: 'Gold Ring' },
      });
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.register(TEST_TENANT_ID, TEST_USER_ID, validInput);

      expect(result.huidNumber).toBe('ABC123');
      expect(result.weightMg).toBe(5000);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'compliance.huid.registered' }),
      );
    });

    it('uppercases the HUID before registering', async () => {
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
      (mockPrisma as any).huidRecord.create.mockResolvedValue({
        id: 'huid-1',
        huidNumber: 'ABC123',
        weightMg: 5000n,
        product: { id: 'prod-1', sku: 'GR-001', name: 'Gold Ring' },
      });
      mockPrisma.product.update.mockResolvedValue({});

      await service.register(TEST_TENANT_ID, TEST_USER_ID, { ...validInput, huidNumber: 'abc123' });

      expect((mockPrisma as any).huidRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ huidNumber: 'ABC123' }),
        }),
      );
    });

    it('rejects invalid HUID format (too short)', async () => {
      await expect(
        service.register(TEST_TENANT_ID, TEST_USER_ID, { ...validInput, huidNumber: 'AB1' }),
      ).rejects.toThrow('Invalid HUID format');
    });

    it('rejects invalid HUID format (special chars)', async () => {
      await expect(
        service.register(TEST_TENANT_ID, TEST_USER_ID, { ...validInput, huidNumber: 'AB@#12' }),
      ).rejects.toThrow('Invalid HUID format');
    });

    it('rejects duplicate HUID within tenant', async () => {
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue({ id: 'existing', huidNumber: 'ABC123' });

      await expect(
        service.register(TEST_TENANT_ID, TEST_USER_ID, validInput),
      ).rejects.toThrow('already registered');
    });

    it('throws NotFoundException when product does not exist', async () => {
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.register(TEST_TENANT_ID, TEST_USER_ID, validInput),
      ).rejects.toThrow('Product not found');
    });

    it('updates product huidNumber after registration', async () => {
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
      (mockPrisma as any).huidRecord.create.mockResolvedValue({
        id: 'huid-1',
        huidNumber: 'ABC123',
        weightMg: 5000n,
        product: { id: 'prod-1', sku: 'GR-001', name: 'Gold Ring' },
      });
      mockPrisma.product.update.mockResolvedValue({});

      await service.register(TEST_TENANT_ID, TEST_USER_ID, validInput);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { huidNumber: 'ABC123', updatedBy: TEST_USER_ID },
      });
    });
  });

  // ─── bulkRegister ───────────────────────────────────────────────

  describe('bulkRegister', () => {
    it('returns success/failure results for each item', async () => {
      // register() calls huidRecord.findFirst (duplicate check), then product.findFirst
      // For first item: no duplicate found, product found -> success
      // For second item: duplicate found -> failure
      (mockPrisma as any).huidRecord.findFirst
        .mockResolvedValueOnce(null)  // 1st item: duplicate check -> no dup
        .mockResolvedValueOnce({ id: 'existing', huidNumber: 'DEF456' }); // 2nd item: duplicate check -> dup found
      (mockPrisma as any).product.findFirst.mockResolvedValue({ id: 'prod-1' });
      (mockPrisma as any).huidRecord.create.mockResolvedValue({
        id: 'huid-1',
        huidNumber: 'ABC123',
        weightMg: 5000n,
        product: { id: 'prod-1', sku: 'GR-001', name: 'Gold Ring' },
      });
      (mockPrisma as any).product.update.mockResolvedValue({});

      const results = await service.bulkRegister(TEST_TENANT_ID, TEST_USER_ID, {
        items: [
          { huidNumber: 'ABC123', productId: 'prod-1', articleType: 'RING', metalType: 'GOLD', purityFineness: 916, weightMg: 5000 },
          { huidNumber: 'DEF456', productId: 'prod-2', articleType: 'CHAIN', metalType: 'GOLD', purityFineness: 916, weightMg: 10000 },
        ],
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });
  });

  // ─── verify ─────────────────────────────────────────────────────

  describe('verify', () => {
    it('returns isValid=true for existing HUID', async () => {
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue({
        id: 'huid-1',
        huidNumber: 'ABC123',
        status: 'ACTIVE',
        weightMg: 5000n,
        product: { id: 'prod-1', sku: 'GR-001', name: 'Gold Ring' },
      });

      const result = await service.verify(TEST_TENANT_ID, 'ABC123');

      expect(result.isValid).toBe(true);
      expect(result.status).toBe('ACTIVE');
    });

    it('returns isValid=false for invalid format', async () => {
      const result = await service.verify(TEST_TENANT_ID, 'AB');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Invalid HUID format');
    });

    it('returns isValid=false when HUID not found', async () => {
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue(null);

      const result = await service.verify(TEST_TENANT_ID, 'ZZZ999');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  // ─── findByProduct ──────────────────────────────────────────────

  describe('findByProduct', () => {
    it('returns all HUID records for a product', async () => {
      (mockPrisma as any).huidRecord.findMany.mockResolvedValue([
        { id: 'h1', huidNumber: 'AAA111', weightMg: 5000n, product: { id: 'p1', sku: 'S1', name: 'R1' } },
        { id: 'h2', huidNumber: 'BBB222', weightMg: 6000n, product: { id: 'p1', sku: 'S1', name: 'R1' } },
      ]);

      const results = await service.findByProduct(TEST_TENANT_ID, 'p1');
      expect(results).toHaveLength(2);
      expect(results[0].weightMg).toBe(5000);
      expect(results[1].weightMg).toBe(6000);
    });
  });

  // ─── enforceHuidOnSale ──────────────────────────────────────────

  describe('enforceHuidOnSale', () => {
    it('returns true for non-GOLD products (no HUID needed)', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', productType: 'SILVER' });

      const result = await service.enforceHuidOnSale(TEST_TENANT_ID, 'p1');
      expect(result).toBe(true);
    });

    it('returns true for GOLD product with active HUID', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', productType: 'GOLD' });
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue({ id: 'h1', status: 'ACTIVE' });

      const result = await service.enforceHuidOnSale(TEST_TENANT_ID, 'p1');
      expect(result).toBe(true);
    });

    it('returns false for GOLD product without active HUID', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', productType: 'GOLD' });
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue(null);

      const result = await service.enforceHuidOnSale(TEST_TENANT_ID, 'p1');
      expect(result).toBe(false);
    });

    it('returns false when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const result = await service.enforceHuidOnSale(TEST_TENANT_ID, 'nonexistent');
      expect(result).toBe(false);
    });
  });

  // ─── getCoverageReport ──────────────────────────────────────────

  describe('getCoverageReport', () => {
    it('calculates coverage percentage correctly', async () => {
      mockPrisma.product.count.mockResolvedValue(100);
      (mockPrisma as any).huidRecord.count.mockResolvedValue(75);

      const report = await service.getCoverageReport(TEST_TENANT_ID);

      expect(report.totalGoldProducts).toBe(100);
      expect(report.productsWithHuid).toBe(75);
      expect(report.coveragePercent).toBe(75);
    });

    it('returns 100% when no gold products exist', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      (mockPrisma as any).huidRecord.count.mockResolvedValue(0);

      const report = await service.getCoverageReport(TEST_TENANT_ID);
      expect(report.coveragePercent).toBe(100);
    });
  });

  // ─── list ───────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated results', async () => {
      (mockPrisma as any).huidRecord.findMany.mockResolvedValue([
        { id: 'h1', huidNumber: 'AAA111', weightMg: 5000n, product: { id: 'p1', sku: 'S1', name: 'R1' } },
      ]);
      (mockPrisma as any).huidRecord.count.mockResolvedValue(1);

      const result = await service.list(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.hasNext).toBe(false);
    });
  });

  // ─── findById ───────────────────────────────────────────────────

  describe('findById', () => {
    it('throws NotFoundException when record not found', async () => {
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue(null);

      await expect(service.findById(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow('HUID record not found');
    });
  });
});
