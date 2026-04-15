import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EInvoiceService } from '../einvoice.service';
import type { IEInvoiceProvider } from '../einvoice-providers/einvoice-provider.interface';
import {
  createMockPrismaService,
  TEST_TENANT_ID,
  resetAllMocks,
} from '../../../__tests__/setup';

const TEST_INVOICE_ID = 'inv-1';

function makeInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TEST_INVOICE_ID,
    tenantId: TEST_TENANT_ID,
    invoiceNumber: 'INV-202604-0001',
    invoiceType: 'SALES',
    status: 'SENT',
    subtotalPaise: BigInt(100000), // Rs. 1000
    discountPaise: BigInt(0),
    taxPaise: BigInt(3000),
    totalPaise: BigInt(103000),
    currencyCode: 'INR',
    createdAt: new Date('2026-04-15T00:00:00Z'),
    notes: null,
    customer: {
      firstName: 'Ravi',
      lastName: 'Kumar',
      gstinNumber: '29ZZZZZ1234Z1Z5',
      address: '12 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      phone: '9999999999',
      email: 'ravi@example.com',
    },
    location: {
      address: '1 Jewel St',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560002',
      phone: '080-1234567',
      email: 'store@caratflow.test',
    },
    lineItems: [
      {
        id: 'li-1',
        description: '22K Gold Ring',
        quantity: 1,
        unitPricePaise: BigInt(100000),
        discountPaise: BigInt(0),
        taxableAmountPaise: BigInt(100000),
        hsnCode: '7113',
        gstRate: 300, // 3%
        cgstPaise: BigInt(1500),
        sgstPaise: BigInt(1500),
        igstPaise: BigInt(0),
        totalPaise: BigInt(103000),
      },
    ],
    ...overrides,
  };
}

function makeTenant() {
  return {
    id: TEST_TENANT_ID,
    name: 'Test Jewels',
    settings: {
      einvoiceSeller: {
        gstin: '29ABCDE1234F1Z5',
        legalName: 'Test Jewels Pvt Ltd',
        stateCode: '29',
        pin: '560002',
      },
    },
  };
}

describe('EInvoiceService', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockProvider: IEInvoiceProvider;
  let service: EInvoiceService;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    resetAllMocks(mockPrisma);

    mockProvider = {
      name: 'mock',
      generateIrn: vi.fn(),
      cancelIrn: vi.fn(),
      getIrnDetails: vi.fn(),
    };
    service = new EInvoiceService(mockPrisma as any, mockProvider, undefined);
  });

  // ─── prepareInvoicePayload ──────────────────────────────────

  describe('prepareInvoicePayload', () => {
    it('builds a NIC 1.1 payload with correct header and totals', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(makeInvoice());
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());

      const payload = await service.prepareInvoicePayload(TEST_TENANT_ID, TEST_INVOICE_ID);

      expect(payload.Version).toBe('1.1');
      expect(payload.TranDtls.TaxSch).toBe('GST');
      expect(payload.TranDtls.SupTyp).toBe('B2B'); // buyer has GSTIN
      expect(payload.DocDtls.Typ).toBe('INV');
      expect(payload.DocDtls.No).toBe('INV-202604-0001');
      expect(payload.DocDtls.Dt).toBe('15/04/2026');
    });

    it('sells to URP B2C when customer has no GSTIN', async () => {
      const inv = makeInvoice();
      (inv.customer as any).gstinNumber = null;
      mockPrisma.invoice.findFirst.mockResolvedValue(inv);
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());

      const payload = await service.prepareInvoicePayload(TEST_TENANT_ID, TEST_INVOICE_ID);
      expect(payload.TranDtls.SupTyp).toBe('B2C');
      expect(payload.BuyerDtls.Gstin).toBe('URP');
    });

    it('converts paise to rupees and sums item values correctly', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(makeInvoice());
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());

      const payload = await service.prepareInvoicePayload(TEST_TENANT_ID, TEST_INVOICE_ID);

      expect(payload.ItemList).toHaveLength(1);
      const item = payload.ItemList[0];
      expect(item.AssAmt).toBe(1000);
      expect(item.CgstAmt).toBe(15);
      expect(item.SgstAmt).toBe(15);
      expect(item.GstRt).toBe(3);
      expect(item.HsnCd).toBe('7113');
      expect(payload.ValDtls.TotInvVal).toBe(1030);
      expect(payload.ValDtls.AssVal).toBe(1000);
    });

    it('uses seller GSTIN from tenant settings', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(makeInvoice());
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());

      const payload = await service.prepareInvoicePayload(TEST_TENANT_ID, TEST_INVOICE_ID);
      expect(payload.SellerDtls.Gstin).toBe('29ABCDE1234F1Z5');
      expect(payload.SellerDtls.Stcd).toBe('29');
    });

    it('throws NotFound when invoice does not exist', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      await expect(
        service.prepareInvoicePayload(TEST_TENANT_ID, 'missing'),
      ).rejects.toThrow(/not found/i);
    });

    it('throws BadRequest when invoice has no line items', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(
        makeInvoice({ lineItems: [] }),
      );
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());
      await expect(
        service.prepareInvoicePayload(TEST_TENANT_ID, TEST_INVOICE_ID),
      ).rejects.toThrow(/no line items/i);
    });

    it('throws when seller GSTIN is not configured', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(makeInvoice());
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        name: 'x',
        settings: {},
      });
      delete process.env.MASTERS_INDIA_GSTIN;
      await expect(
        service.prepareInvoicePayload(TEST_TENANT_ID, TEST_INVOICE_ID),
      ).rejects.toThrow(/Seller GSTIN/);
    });
  });

  // ─── submitToIrp ────────────────────────────────────────────

  describe('submitToIrp', () => {
    it('persists IRN to invoice notes on success', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(makeInvoice());
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());
      (mockProvider.generateIrn as any).mockResolvedValue({
        irn: 'irn-abc-123',
        ackNo: '999',
        ackDate: '2026-04-15 10:00',
        signedInvoice: 'jwt.si',
        signedQrCode: 'jwt.qr',
        status: 'ACT',
      });
      mockPrisma.invoice.update.mockResolvedValue({});

      const res = await service.submitToIrp(TEST_TENANT_ID, TEST_INVOICE_ID);

      expect(res.status).toBe('ACT');
      expect(res.irn).toBe('irn-abc-123');
      expect(mockPrisma.invoice.update).toHaveBeenCalled();
      const updateCall = mockPrisma.invoice.update.mock.calls[0][0];
      expect(updateCall.data.notes).toContain('__einvoice__:');
      expect(updateCall.data.notes).toContain('irn-abc-123');
    });

    it('refuses to re-submit when an active IRN already exists', async () => {
      const existingState = {
        irn: 'irn-existing',
        ackNo: '1',
        ackDate: '2026-04-15',
        signedQrCode: 'qr',
        signedInvoice: 'si',
        status: 'ACT',
        provider: 'mock',
        generatedAt: new Date().toISOString(),
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(
        makeInvoice({ notes: `__einvoice__:${JSON.stringify(existingState)}` }),
      );

      await expect(
        service.submitToIrp(TEST_TENANT_ID, TEST_INVOICE_ID),
      ).rejects.toThrow(/already has an active IRN/);
    });

    it('still writes state when provider returns ERROR', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(makeInvoice());
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());
      (mockProvider.generateIrn as any).mockResolvedValue({
        irn: null,
        ackNo: null,
        ackDate: null,
        signedInvoice: null,
        signedQrCode: null,
        status: 'ERROR',
        errorCode: '2150',
        errorMessage: 'Duplicate',
      });
      mockPrisma.invoice.update.mockResolvedValue({});

      const res = await service.submitToIrp(TEST_TENANT_ID, TEST_INVOICE_ID);
      expect(res.status).toBe('ERROR');
      expect(mockPrisma.invoice.update).toHaveBeenCalled();
    });
  });

  // ─── cancelEInvoice ─────────────────────────────────────────

  describe('cancelEInvoice', () => {
    const activeState = (generatedAt: Date) => ({
      irn: 'irn-active',
      ackNo: '1',
      ackDate: '2026-04-15',
      signedQrCode: 'qr',
      signedInvoice: 'si',
      status: 'ACT',
      provider: 'mock',
      generatedAt: generatedAt.toISOString(),
    });

    it('allows cancel within 24 hours', async () => {
      const state = activeState(new Date(Date.now() - 60 * 60 * 1000));
      mockPrisma.invoice.findFirst.mockResolvedValue(
        makeInvoice({ notes: `__einvoice__:${JSON.stringify(state)}` }),
      );
      (mockProvider.cancelIrn as any).mockResolvedValue({
        irn: 'irn-active',
        cancelDate: '2026-04-15 12:00',
        status: 'CNL',
      });
      mockPrisma.invoice.update.mockResolvedValue({});

      const res = await service.cancelEInvoice(
        TEST_TENANT_ID,
        TEST_INVOICE_ID,
        '1',
        'duplicate upload',
      );
      expect(res.status).toBe('CNL');
      expect(mockProvider.cancelIrn).toHaveBeenCalledWith(
        'irn-active',
        '1',
        'duplicate upload',
      );
    });

    it('rejects cancel after 24 hours', async () => {
      const state = activeState(new Date(Date.now() - 25 * 60 * 60 * 1000));
      mockPrisma.invoice.findFirst.mockResolvedValue(
        makeInvoice({ notes: `__einvoice__:${JSON.stringify(state)}` }),
      );

      await expect(
        service.cancelEInvoice(TEST_TENANT_ID, TEST_INVOICE_ID, '1', 'too late'),
      ).rejects.toThrow(/24 hours/);
      expect(mockProvider.cancelIrn).not.toHaveBeenCalled();
    });

    it('rejects cancel when no IRN exists', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(makeInvoice());
      await expect(
        service.cancelEInvoice(TEST_TENANT_ID, TEST_INVOICE_ID, '1', 'x'),
      ).rejects.toThrow(/no active IRN/);
    });
  });

  describe('getProviderName', () => {
    it('returns the injected provider name', () => {
      expect(service.getProviderName()).toBe('mock');
    });
  });
});
