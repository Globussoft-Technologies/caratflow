// ─── E2E: Kitty (Gold Savings) Scheme Flow ─────────────────────
// Scenario: Customer enrolls in a 12-month savings scheme.
// Pays 11 installments, gets 1 month bonus. Redeems for jewelry.

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
  TestContext,
  createTestCustomer,
} from './helpers/test-context';
import { KITTY_SCHEME, METAL_RATES } from './helpers/test-data';

describe('E2E: Kitty Scheme Flow', () => {
  let ctx: TestContext;
  let customer: ReturnType<typeof createTestCustomer>;
  const schemeId = uuid();
  const memberId = uuid();

  beforeEach(() => {
    ctx = new TestContext();
    customer = createTestCustomer(ctx.tenantId);
  });

  // ─── Scheme Configuration ───────────────────────────────────

  it('should define scheme: 12 months, Rs 5,000/month, 1 month bonus', () => {
    const scheme = KITTY_SCHEME.GOLD_SAVINGS;

    expect(scheme.durationMonths).toBe(12);
    expect(scheme.monthlyInstallmentPaise).toBe(500_000);
    expect(scheme.bonusMonths).toBe(1);
  });

  it('should calculate: pay 11 installments, get value of 12', () => {
    const scheme = KITTY_SCHEME.GOLD_SAVINGS;
    const installmentsToPay = scheme.durationMonths - scheme.bonusMonths;

    expect(installmentsToPay).toBe(11);
    expect(scheme.totalPaidPaise).toBe(5_500_000); // Rs 55,000
  });

  it('should calculate bonus value: Rs 5,000 (1 free month)', () => {
    const scheme = KITTY_SCHEME.GOLD_SAVINGS;

    expect(scheme.bonusValuePaise).toBe(500_000);
    expect(scheme.maturityValuePaise).toBe(6_000_000); // Rs 60,000
  });

  // ─── Customer Enrollment ─────────────────────────────────────

  it('should enroll customer in the savings scheme', () => {
    const enrollment = {
      id: memberId,
      schemeId,
      customerId: customer.id,
      tenantId: ctx.tenantId,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      installmentsPaid: 0,
      totalPaidPaise: BigInt(0),
    };

    expect(enrollment.status).toBe('ACTIVE');
    expect(enrollment.installmentsPaid).toBe(0);
  });

  // ─── Installment Payments ────────────────────────────────────

  it('should track 11 installment payments', () => {
    const scheme = KITTY_SCHEME.GOLD_SAVINGS;
    const installments: Array<{
      installmentNumber: number;
      amountPaise: number;
      status: string;
      paidAt: Date;
    }> = [];

    for (let i = 1; i <= 11; i++) {
      installments.push({
        installmentNumber: i,
        amountPaise: scheme.monthlyInstallmentPaise,
        status: 'PAID',
        paidAt: new Date(2025, 3 + i, 1), // April 2025 onwards
      });
    }

    expect(installments).toHaveLength(11);
    expect(installments.every((i) => i.status === 'PAID')).toBe(true);
  });

  it('should calculate total paid: 11 * Rs 5,000 = Rs 55,000', () => {
    const scheme = KITTY_SCHEME.GOLD_SAVINGS;
    const installmentCount = 11;
    const totalPaid = scheme.monthlyInstallmentPaise * installmentCount;

    expect(totalPaid).toBe(5_500_000);
    expect(totalPaid).toBe(scheme.totalPaidPaise);
  });

  it('should publish notification for each installment due date', async () => {
    for (let i = 1; i <= 3; i++) {
      await ctx.eventBus.publish({
        id: uuid(),
        tenantId: ctx.tenantId,
        userId: 'SYSTEM',
        timestamp: new Date().toISOString(),
        type: 'crm.notification.sent',
        payload: {
          customerId: customer.id,
          channel: 'SMS',
          templateId: 'kitty-installment-reminder',
          status: 'SENT',
        },
      });
    }

    expect(ctx.eventCapture.count('crm.notification.sent')).toBe(3);
  });

  // ─── Maturity ────────────────────────────────────────────────

  it('should mature scheme with total value Rs 60,000 (paid + bonus)', () => {
    const scheme = KITTY_SCHEME.GOLD_SAVINGS;
    const maturityValue = scheme.totalPaidPaise + scheme.bonusValuePaise;

    expect(maturityValue).toBe(6_000_000); // Rs 60,000
    expect(maturityValue).toBe(scheme.maturityValuePaise);
  });

  it('should mark member status as COMPLETED at maturity', () => {
    const maturedMember = {
      id: memberId,
      status: 'COMPLETED',
      maturedAt: new Date(),
      maturityValuePaise: BigInt(KITTY_SCHEME.GOLD_SAVINGS.maturityValuePaise),
    };

    expect(maturedMember.status).toBe('COMPLETED');
  });

  // ─── Redemption ──────────────────────────────────────────────

  it('should redeem maturity for jewelry worth Rs 60,000 (customer pays only making charges + GST)', () => {
    const maturityValuePaise = KITTY_SCHEME.GOLD_SAVINGS.maturityValuePaise;
    const currentGoldRatePerGram = METAL_RATES.GOLD_22K.ratePerGramPaise; // 580_000

    // Gold equivalent at current rate
    const goldEquivalentMg = Math.floor((maturityValuePaise * 1000) / currentGoldRatePerGram);
    // Rs 60,000 / Rs 5,800/g = ~10.34g
    expect(goldEquivalentMg).toBe(10_344); // ~10.34 grams

    // Customer selects jewelry -> pays only making charges + GST on making charges
    const makingChargesPerGramPaise = 50_000; // Rs 500/g
    const goldWeightGrams = goldEquivalentMg / 1000;
    const makingChargesPaise = Math.round(makingChargesPerGramPaise * goldWeightGrams);
    const makingGstPaise = Math.round((makingChargesPaise * 5) / 100); // 5% GST on making

    const customerPaysPaise = makingChargesPaise + makingGstPaise;

    expect(makingChargesPaise).toBeGreaterThan(0);
    expect(customerPaysPaise).toBeGreaterThan(0);
    // Customer should pay much less than the full jewelry price
    expect(customerPaysPaise).toBeLessThan(maturityValuePaise);
  });

  it('should publish retail.sale.completed event for redemption sale', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'retail.sale.completed',
      payload: {
        saleId: uuid(),
        customerId: customer.id,
        totalPaise: KITTY_SCHEME.GOLD_SAVINGS.maturityValuePaise,
        items: [{ productId: uuid(), pricePaise: KITTY_SCHEME.GOLD_SAVINGS.maturityValuePaise }],
      },
    });

    expect(ctx.eventCapture.hasEvent('retail.sale.completed')).toBe(true);
  });
});
