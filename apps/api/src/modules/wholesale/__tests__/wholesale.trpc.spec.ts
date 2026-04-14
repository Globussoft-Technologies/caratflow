// ─── Wholesale tRPC Router — supplier procedures ──────────────
// Only covers the new supplier procedures added to the wholesale
// tRPC router: listSuppliers, getSupplier, createSupplier,
// updateSupplier, deactivateSupplier, getSupplierPerformance,
// listSuppliersWithPerformance.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrpcService } from '../../../trpc/trpc.service';
import { WholesaleTrpcRouter } from '../wholesale.trpc';

describe('WholesaleTrpcRouter (suppliers)', () => {
  const trpc = new TrpcService();

  const wholesaleService = {
    getDashboard: vi.fn(),
    createPurchaseOrder: vi.fn(),
    getPurchaseOrder: vi.fn(),
    listPurchaseOrders: vi.fn(),
    sendPurchaseOrder: vi.fn(),
    cancelPurchaseOrder: vi.fn(),
    createGoodsReceipt: vi.fn(),
    getGoodsReceipt: vi.fn(),
    listGoodsReceipts: vi.fn(),
    inspectGoodsReceipt: vi.fn(),
    acceptGoodsReceipt: vi.fn(),
    rejectGoodsReceipt: vi.fn(),
  };
  const consignmentService = {
    createConsignmentOut: vi.fn(),
    getConsignmentOut: vi.fn(),
    listConsignmentsOut: vi.fn(),
    issueConsignmentOut: vi.fn(),
    returnConsignmentOutItems: vi.fn(),
    convertConsignmentOutToSale: vi.fn(),
    expireConsignmentOut: vi.fn(),
    createConsignmentIn: vi.fn(),
    getConsignmentIn: vi.fn(),
    listConsignmentsIn: vi.fn(),
    returnConsignmentInItems: vi.fn(),
    purchaseConsignmentInItems: vi.fn(),
    expireConsignmentIn: vi.fn(),
    getExpiredConsignments: vi.fn(),
  };
  const agentService = {
    createAgent: vi.fn(),
    getAgent: vi.fn(),
    listAgents: vi.fn(),
    updateAgent: vi.fn(),
    calculateCommission: vi.fn(),
    approveCommission: vi.fn(),
    markCommissionPaid: vi.fn(),
    listCommissions: vi.fn(),
  };
  const creditService = {
    setCreditLimit: vi.fn(),
    getCreditLimit: vi.fn(),
    listCreditLimits: vi.fn(),
    checkCredit: vi.fn(),
    listOutstandingBalances: vi.fn(),
    recordPaymentOnOutstanding: vi.fn(),
    updateAgingStatuses: vi.fn(),
    getAgingSummary: vi.fn(),
  };
  const rateContractService = {
    createRateContract: vi.fn(),
    getRateContract: vi.fn(),
    listRateContracts: vi.fn(),
    updateRateContract: vi.fn(),
    findApplicableRate: vi.fn(),
  };
  const supplierService = {
    listSuppliers: vi.fn(),
    getSupplier: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    deactivateSupplier: vi.fn(),
    getSupplierPerformance: vi.fn(),
    listSuppliersWithPerformance: vi.fn(),
  };

  const ctx = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    userRole: 'admin',
    userPermissions: [],
  };

  const routerInstance = new WholesaleTrpcRouter(
    trpc,
    wholesaleService as never,
    consignmentService as never,
    agentService as never,
    creditService as never,
    rateContractService as never,
    supplierService as never,
  );
  const caller = routerInstance.router.createCaller(ctx);

  beforeEach(() => vi.clearAllMocks());

  const SUPPLIER_ID = '11111111-1111-1111-1111-111111111111';

  const validSupplier = {
    name: 'ABC Suppliers',
    email: 'abc@example.com',
    isActive: true,
  };

  describe('listSuppliers', () => {
    it('delegates to supplierService.listSuppliers with defaults', async () => {
      supplierService.listSuppliers.mockResolvedValue({ items: [] });
      await caller.listSuppliers({});
      expect(supplierService.listSuppliers).toHaveBeenCalledWith(
        'tenant-1',
        {},
        expect.objectContaining({ page: 1, limit: 20, sortOrder: 'asc' }),
      );
    });

    it('forwards filters and pagination', async () => {
      supplierService.listSuppliers.mockResolvedValue({ items: [] });
      await caller.listSuppliers({
        filters: { isActive: true, search: 'abc' },
        pagination: { page: 2, limit: 10, sortOrder: 'desc' },
      });
      expect(supplierService.listSuppliers).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ isActive: true, search: 'abc' }),
        expect.objectContaining({ page: 2, limit: 10, sortOrder: 'desc' }),
      );
    });
  });

  describe('getSupplier', () => {
    it('delegates to supplierService.getSupplier', async () => {
      supplierService.getSupplier.mockResolvedValue({ id: SUPPLIER_ID });
      const result = await caller.getSupplier({ id: SUPPLIER_ID });
      expect(supplierService.getSupplier).toHaveBeenCalledWith('tenant-1', SUPPLIER_ID);
      expect(result).toEqual({ id: SUPPLIER_ID });
    });

    it('rejects invalid uuid', async () => {
      await expect(caller.getSupplier({ id: 'bogus' })).rejects.toThrow();
    });
  });

  describe('createSupplier', () => {
    it('delegates to supplierService.createSupplier with tenantId + userId + input', async () => {
      supplierService.createSupplier.mockResolvedValue({ id: SUPPLIER_ID });
      const result = await caller.createSupplier(validSupplier);
      expect(supplierService.createSupplier).toHaveBeenCalledWith(
        'tenant-1', 'user-1',
        expect.objectContaining({ name: 'ABC Suppliers' }),
      );
      expect(result).toEqual({ id: SUPPLIER_ID });
    });

    it('rejects invalid email', async () => {
      await expect(
        caller.createSupplier({ ...validSupplier, email: 'not-an-email' } as never),
      ).rejects.toThrow();
    });

    it('rejects empty name', async () => {
      await expect(
        caller.createSupplier({ ...validSupplier, name: '' } as never),
      ).rejects.toThrow();
    });
  });

  describe('updateSupplier', () => {
    it('delegates to supplierService.updateSupplier', async () => {
      supplierService.updateSupplier.mockResolvedValue({});
      await caller.updateSupplier({
        id: SUPPLIER_ID,
        data: { name: 'New Name' },
      });
      expect(supplierService.updateSupplier).toHaveBeenCalledWith(
        'tenant-1', 'user-1', SUPPLIER_ID,
        expect.objectContaining({ name: 'New Name' }),
      );
    });

    it('rejects invalid id', async () => {
      await expect(
        caller.updateSupplier({ id: 'bogus', data: {} }),
      ).rejects.toThrow();
    });
  });

  describe('deactivateSupplier', () => {
    it('delegates to supplierService.deactivateSupplier', async () => {
      supplierService.deactivateSupplier.mockResolvedValue({});
      await caller.deactivateSupplier({ id: SUPPLIER_ID });
      expect(supplierService.deactivateSupplier).toHaveBeenCalledWith(
        'tenant-1', 'user-1', SUPPLIER_ID,
      );
    });
  });

  describe('getSupplierPerformance', () => {
    it('delegates to supplierService.getSupplierPerformance', async () => {
      supplierService.getSupplierPerformance.mockResolvedValue({ totalOrders: 3 });
      const result = await caller.getSupplierPerformance({ id: SUPPLIER_ID });
      expect(supplierService.getSupplierPerformance).toHaveBeenCalledWith(
        'tenant-1', SUPPLIER_ID,
      );
      expect(result).toEqual({ totalOrders: 3 });
    });
  });

  describe('listSuppliersWithPerformance', () => {
    it('delegates with defaults', async () => {
      supplierService.listSuppliersWithPerformance.mockResolvedValue({ items: [] });
      await caller.listSuppliersWithPerformance({});
      expect(supplierService.listSuppliersWithPerformance).toHaveBeenCalledWith(
        'tenant-1',
        {},
        expect.objectContaining({ page: 1, limit: 20, sortOrder: 'asc' }),
      );
    });

    it('forwards filters and pagination', async () => {
      supplierService.listSuppliersWithPerformance.mockResolvedValue({ items: [] });
      await caller.listSuppliersWithPerformance({
        filters: { isActive: true },
        pagination: { page: 3, limit: 5, sortOrder: 'desc' },
      });
      expect(supplierService.listSuppliersWithPerformance).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ isActive: true }),
        expect.objectContaining({ page: 3, limit: 5, sortOrder: 'desc' }),
      );
    });
  });

  it('rejects unauthenticated calls', async () => {
    const unauth = routerInstance.router.createCaller({});
    await expect(unauth.getSupplier({ id: SUPPLIER_ID })).rejects.toThrow();
  });
});
