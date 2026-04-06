import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingCustomService } from '../reporting.custom.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

describe('ReportingCustomService (Unit)', () => {
  let service: ReportingCustomService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new ReportingCustomService(mockPrisma as any);
  });

  describe('getSupportedEntities', () => {
    it('returns list of supported entities with field metadata', () => {
      const entities = service.getSupportedEntities();
      expect(entities.length).toBeGreaterThanOrEqual(5);

      const sales = entities.find((e) => e.name === 'sales');
      expect(sales).toBeDefined();
      expect(sales!.fields.length).toBeGreaterThan(0);

      const totalField = sales!.fields.find((f) => f.name === 'totalPaise');
      expect(totalField!.aggregatable).toBe(true);
    });

    it('includes customers, products, invoices, and job_orders', () => {
      const entities = service.getSupportedEntities();
      const names = entities.map((e) => e.name);
      expect(names).toContain('customers');
      expect(names).toContain('products');
      expect(names).toContain('invoices');
      expect(names).toContain('job_orders');
    });
  });

  describe('validateReportConfig', () => {
    it('returns valid for correct configuration', () => {
      const result = service.validateReportConfig({
        entityType: 'sales',
        columns: ['saleNumber', 'totalPaise', 'status'],
        groupBy: [],
        aggregations: [],
        filters: [],
        sortBy: [],
      } as any);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects unknown entity type', () => {
      const result = service.validateReportConfig({
        entityType: 'unknown',
        columns: ['x'],
        groupBy: [],
        aggregations: [],
        filters: [],
        sortBy: [],
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown entity');
    });

    it('rejects invalid column names', () => {
      const result = service.validateReportConfig({
        entityType: 'sales',
        columns: ['saleNumber', 'badColumn'],
        groupBy: [],
        aggregations: [],
        filters: [],
        sortBy: [],
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid column: badColumn');
    });

    it('rejects non-aggregatable field in aggregation', () => {
      const result = service.validateReportConfig({
        entityType: 'sales',
        columns: [],
        groupBy: ['status'],
        aggregations: [{ field: 'saleNumber', function: 'SUM' }],
        filters: [],
        sortBy: [],
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field saleNumber is not aggregatable');
    });

    it('rejects non-filterable field in filters', () => {
      const result = service.validateReportConfig({
        entityType: 'customers',
        columns: ['firstName'],
        groupBy: [],
        aggregations: [],
        filters: [{ field: 'badField', operator: 'eq', value: 'X' }],
        sortBy: [],
      } as any);

      expect(result.valid).toBe(false);
    });
  });

  describe('executeCustomReport', () => {
    it('executes a query and returns results', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { saleNumber: 'SL-001', totalPaise: 500000n, status: 'COMPLETED' },
      ]);
      // The service uses $queryRawUnsafe
      (mockPrisma as any).$queryRawUnsafe = vi.fn().mockResolvedValue([
        { saleNumber: 'SL-001', totalPaise: 500000n, status: 'COMPLETED' },
      ]);

      const result = await service.executeCustomReport(TEST_TENANT_ID, {
        entityType: 'sales',
        columns: ['saleNumber', 'totalPaise', 'status'],
        groupBy: [],
        aggregations: [],
        filters: [],
        sortBy: [],
      } as any);

      expect(result.rows).toHaveLength(1);
      expect(result.headers).toHaveLength(3);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('throws for unsupported entity type', async () => {
      await expect(
        service.executeCustomReport(TEST_TENANT_ID, {
          entityType: 'bad',
          columns: ['x'],
          groupBy: [],
          aggregations: [],
          filters: [],
          sortBy: [],
        } as any),
      ).rejects.toThrow();
    });

    it('throws for no valid columns', async () => {
      await expect(
        service.executeCustomReport(TEST_TENANT_ID, {
          entityType: 'sales',
          columns: ['invalidCol'],
          groupBy: [],
          aggregations: [],
          filters: [],
          sortBy: [],
        } as any),
      ).rejects.toThrow('No valid columns');
    });
  });
});
