import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialEventHandler } from '../financial.event-handler';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('FinancialEventHandler', () => {
  let handler: FinancialEventHandler;
  let mockFinancialService: {
    createInvoice: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockFinancialService = {
      createInvoice: vi.fn().mockResolvedValue({ id: 'inv-1' }),
    };

    handler = new FinancialEventHandler(mockFinancialService as any);
  });

  it('initializes without error on onModuleInit', () => {
    expect(() => handler.onModuleInit()).not.toThrow();
  });

  it('handles retail sale completed by creating a sales invoice', async () => {
    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        saleId: 'sale-1',
        customerId: 'cust-1',
        totalPaise: 500000,
        items: [
          { productId: 'prod-1', pricePaise: 300000 },
          { productId: 'prod-2', pricePaise: 200000 },
        ],
      },
    };

    await handler.handleRetailSale(event as any);

    expect(mockFinancialService.createInvoice).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      TEST_USER_ID,
      expect.objectContaining({
        invoiceType: 'SALES',
        customerId: 'cust-1',
        currencyCode: 'INR',
        lineItems: expect.arrayContaining([
          expect.objectContaining({
            productId: 'prod-1',
            unitPricePaise: 300000,
            hsnCode: '7113',
            gstRate: 300,
          }),
        ]),
      }),
    );
  });

  it('handles wholesale purchase completed by creating a purchase invoice', async () => {
    const event = {
      type: 'wholesale.purchase.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        purchaseOrderId: 'po-1',
        supplierId: 'sup-1',
        totalPaise: 1000000,
      },
    };

    await handler.handleWholesalePurchase(event as any);

    expect(mockFinancialService.createInvoice).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      TEST_USER_ID,
      expect.objectContaining({
        invoiceType: 'PURCHASE',
        supplierId: 'sup-1',
        currencyCode: 'INR',
        lineItems: expect.arrayContaining([
          expect.objectContaining({
            unitPricePaise: 1000000,
            hsnCode: '7113',
            gstRate: 300,
          }),
        ]),
      }),
    );
  });

  it('handles errors in retail sale without crashing', async () => {
    mockFinancialService.createInvoice.mockRejectedValue(new Error('DB error'));

    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        saleId: 'sale-1',
        customerId: 'cust-1',
        totalPaise: 500000,
        items: [{ productId: 'prod-1', pricePaise: 500000 }],
      },
    };

    await expect(handler.handleRetailSale(event as any)).resolves.not.toThrow();
  });

  it('handles errors in wholesale purchase without crashing', async () => {
    mockFinancialService.createInvoice.mockRejectedValue(new Error('DB error'));

    const event = {
      type: 'wholesale.purchase.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        purchaseOrderId: 'po-1',
        supplierId: 'sup-1',
        totalPaise: 1000000,
      },
    };

    await expect(handler.handleWholesalePurchase(event as any)).resolves.not.toThrow();
  });

  it('creates correct line items with HSN code and GST rate for jewelry', async () => {
    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        saleId: 'sale-2',
        customerId: 'cust-2',
        totalPaise: 650000,
        items: [{ productId: 'prod-gold-1', pricePaise: 650000 }],
      },
    };

    await handler.handleRetailSale(event as any);

    const callArgs = mockFinancialService.createInvoice.mock.calls[0][2];
    expect(callArgs.lineItems[0].hsnCode).toBe('7113');
    expect(callArgs.lineItems[0].gstRate).toBe(300); // 3%
    expect(callArgs.lineItems[0].quantity).toBe(1);
    expect(callArgs.lineItems[0].discountPaise).toBe(0);
  });
});
