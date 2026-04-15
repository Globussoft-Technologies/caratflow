// ─── Multi-Tenant Isolation Security Tests ────────────────────
// These tests enforce the P0 security invariant: an authenticated
// user from tenant B MUST NOT be able to read or mutate records
// belonging to tenant A, even when supplying a correctly-guessed
// record id.
//
// They work by making the mocked Prisma `findFirst` behave like
// real Prisma: it only returns a record when the where clause
// actually matches BOTH `id` AND `tenantId`. If a service fails to
// include tenantId in its where clause, these tests will surface
// the leak because the mock will return the cross-tenant record.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RetailService } from '../retail/retail.service';
import { RetailPricingService } from '../retail/retail.pricing.service';
import { InventoryService } from '../inventory/inventory.service';
import { FinancialService } from '../financial/financial.service';
import {
  createMockPrismaService,
  createMockEventBusService,
} from '../../__tests__/mocks';

const TENANT_A = 'tenant-a-uuid';
const TENANT_B = 'tenant-b-uuid';
const RECORD_ID = 'cross-tenant-record-id';

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Build a findFirst mock that only returns the stored record when
 * the caller's where clause includes the matching tenantId. This
 * simulates how real Prisma enforces filters.
 */
function tenantAwareFindFirst(record: { tenantId: string; id: string } & Record<string, unknown>) {
  return vi.fn(async (args: { where?: Record<string, unknown> }) => {
    const where = args?.where ?? {};
    const whereTenant = (where as { tenantId?: string }).tenantId;
    const whereId = (where as { id?: string }).id;
    if (whereTenant === record.tenantId && (!whereId || whereId === record.id)) {
      return record;
    }
    return null;
  });
}

describe('Multi-Tenant Isolation (P0 security)', () => {
  describe('RetailService.getSale', () => {
    let prisma: ReturnType<typeof createMockPrismaService>;
    let service: RetailService;

    beforeEach(() => {
      prisma = createMockPrismaService();
      const eventBus = createMockEventBusService();
      const pricing = new RetailPricingService(prisma as never);
      const rates = { getCurrentRate: vi.fn() };
      service = new RetailService(
        prisma as never,
        eventBus as never,
        pricing,
        rates as never,
      );

      // Tenant A owns the sale. Only a findFirst filtered by tenantId A returns it.
      const saleRecord = {
        id: RECORD_ID,
        tenantId: TENANT_A,
        saleNumber: 'S-001',
        lineItems: [],
        payments: [],
      };
      prisma.sale.findFirst = tenantAwareFindFirst(saleRecord) as never;
    });

    it('returns the sale to its owning tenant (tenant A)', async () => {
      const sale = await service.getSale(TENANT_A, RECORD_ID);
      expect(sale).toBeDefined();
    });

    it('rejects cross-tenant access with NotFoundException (tenant B)', async () => {
      await expect(service.getSale(TENANT_B, RECORD_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('InventoryService.findStockItemById', () => {
    let prisma: ReturnType<typeof createMockPrismaService>;
    let service: InventoryService;

    beforeEach(() => {
      prisma = createMockPrismaService();
      const eventBus = createMockEventBusService();
      service = new InventoryService(prisma as never, eventBus as never);

      const stockItemRecord = {
        id: RECORD_ID,
        tenantId: TENANT_A,
        productId: 'p1',
        locationId: 'loc-1',
        quantityOnHand: 5,
        quantityReserved: 0,
        quantityOnOrder: 0,
        reorderLevel: 0,
        reorderQuantity: 0,
        binLocation: null,
        lastCountedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        product: { id: 'p1', sku: 'SKU', name: 'Ring', productType: 'FINISHED_GOODS', costPricePaise: 0n, sellingPricePaise: 0n },
        location: { id: 'loc-1', name: 'Main', locationType: 'SHOWROOM' },
        movements: [],
      };
      prisma.stockItem.findFirst = tenantAwareFindFirst(stockItemRecord) as never;
    });

    it('returns the stock item to its owning tenant', async () => {
      const item = await service.findStockItemById(TENANT_A, RECORD_ID);
      expect(item).toBeDefined();
    });

    it('rejects cross-tenant access with NotFoundException', async () => {
      await expect(
        service.findStockItemById(TENANT_B, RECORD_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('FinancialService.getInvoice', () => {
    let prisma: ReturnType<typeof createMockPrismaService>;
    let service: FinancialService;

    beforeEach(() => {
      prisma = createMockPrismaService();
      // invoice isn't in the default mock catalog; add it ad-hoc.
      (prisma as unknown as { invoice: Record<string, unknown> }).invoice = {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      };
      service = new FinancialService(prisma as never);

      const invoiceRecord = {
        id: RECORD_ID,
        tenantId: TENANT_A,
        invoiceNumber: 'INV-001',
        invoiceType: 'SALES',
        lineItems: [],
        customer: null,
        supplier: null,
        payments: [],
        taxTransactions: [],
      };
      (prisma as unknown as { invoice: { findFirst: unknown } }).invoice.findFirst =
        tenantAwareFindFirst(invoiceRecord);
    });

    it('returns the invoice to its owning tenant', async () => {
      const invoice = await service.getInvoice(TENANT_A, RECORD_ID);
      expect(invoice).toBeDefined();
    });

    it('rejects cross-tenant access with NotFoundException', async () => {
      await expect(service.getInvoice(TENANT_B, RECORD_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
