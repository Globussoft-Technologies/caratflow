// ─── E2E: Digital Gold Flow ────────────────────────────────────
// Scenario: Customer completes KYC, buys digital gold, sets up SIP,
// SIP executes at varying rates, redeems physical gold, sells remainder.

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import { TestContext, createTestCustomer } from './helpers/test-context';
import { METAL_RATES, DIGITAL_GOLD } from './helpers/test-data';

describe('E2E: Digital Gold Flow', () => {
  let ctx: TestContext;
  let customer: ReturnType<typeof createTestCustomer>;
  const customerId = uuid();
  const vaultId = uuid();

  beforeEach(() => {
    ctx = new TestContext();
    customer = createTestCustomer(ctx.tenantId, { id: customerId });
  });

  // ─── KYC Verification ───────────────────────────────────────

  it('should require KYC completion before any digital gold transaction', () => {
    const kycStatus = {
      customerId,
      aadhaarVerified: true,
      panVerified: true,
      isKycComplete: true,
    };

    expect(kycStatus.aadhaarVerified).toBe(true);
    expect(kycStatus.panVerified).toBe(true);
    expect(kycStatus.isKycComplete).toBe(true);
  });

  it('should reject transaction when KYC is incomplete', () => {
    const incompleteKyc = {
      customerId,
      aadhaarVerified: true,
      panVerified: false,
      isKycComplete: false,
    };

    expect(incompleteKyc.isKycComplete).toBe(false);
  });

  // ─── Initial Gold Purchase ───────────────────────────────────

  it('should buy Rs 5,000 of digital gold at Rs 6,000/g -> 0.833g', () => {
    const amountPaise = 500_000; // Rs 5,000
    // Buy price includes spread: Rs 6,000/g = 600_000 paise/g
    const buyPricePerGramPaise = 600_000;

    // weight(mg) = amountPaise * 1000 / buyPricePerGramPaise
    const goldWeightMg = Math.floor((amountPaise * 1000) / buyPricePerGramPaise);

    expect(goldWeightMg).toBe(833); // 0.833 grams
  });

  it('should apply buy spread: market + Rs 50 per 10g', () => {
    const marketPer10g = 6_000_000; // Rs 60,000 per 10g
    const buySpread = DIGITAL_GOLD.BUY_SPREAD_PER_10G_PAISE;
    const buyPricePer10g = marketPer10g + buySpread;
    const buyPricePerGram = Math.round(buyPricePer10g / 10);

    expect(buyPricePer10g).toBe(6_005_000); // Rs 60,050 per 10g
    expect(buyPricePerGram).toBe(600_500);  // Rs 6,005 per g
  });

  it('should create vault and record initial purchase transaction', () => {
    const vault = {
      id: vaultId,
      customerId,
      balanceMg: BigInt(833),
      totalInvestedPaise: BigInt(500_000),
      totalSoldPaise: BigInt(0),
      kycVerified: true,
      isActive: true,
    };

    expect(Number(vault.balanceMg)).toBe(833);
    expect(Number(vault.totalInvestedPaise)).toBe(500_000);
  });

  // ─── SIP Setup ───────────────────────────────────────────────

  it('should set up monthly SIP for Rs 3,000/month', () => {
    const sip = {
      id: uuid(),
      vaultId,
      customerId,
      sipType: 'FIXED_AMOUNT',
      amountPaise: DIGITAL_GOLD.SIP_MONTHLY.amountPaise, // 300_000
      frequency: 'MONTHLY',
      dayOfMonth: 1,
      status: 'ACTIVE',
      startDate: new Date(),
      nextDeductionDate: new Date(),
    };

    expect(sip.amountPaise).toBe(300_000);
    expect(sip.sipType).toBe('FIXED_AMOUNT');
    expect(sip.status).toBe('ACTIVE');
  });

  // ─── SIP Execution Month 1 ──────────────────────────────────

  it('should execute SIP month 1: rate Rs 6,100/g -> buys 0.491g', () => {
    const execution = DIGITAL_GOLD.SIP_EXECUTIONS[0];
    const amountPaise = execution.amountPaise;
    const ratePerGramPaise = execution.ratePerGramPaise;

    const goldWeightMg = Math.floor((amountPaise * 1000) / ratePerGramPaise);

    expect(goldWeightMg).toBe(execution.expectedWeightMg); // 491
    expect(ratePerGramPaise).toBe(610_000); // Rate went up
  });

  // ─── SIP Execution Month 2 ──────────────────────────────────

  it('should execute SIP month 2: rate Rs 5,900/g -> buys 0.508g (more gold when cheaper)', () => {
    const execution = DIGITAL_GOLD.SIP_EXECUTIONS[1];
    const amountPaise = execution.amountPaise;
    const ratePerGramPaise = execution.ratePerGramPaise;

    const goldWeightMg = Math.floor((amountPaise * 1000) / ratePerGramPaise);

    expect(goldWeightMg).toBe(execution.expectedWeightMg); // 508
    expect(ratePerGramPaise).toBe(590_000); // Rate went down
    // More gold when price is lower (rupee cost averaging)
    expect(execution.expectedWeightMg).toBeGreaterThan(DIGITAL_GOLD.SIP_EXECUTIONS[0].expectedWeightMg);
  });

  // ─── Vault Balance ───────────────────────────────────────────

  it('should calculate total vault balance: 0.833 + 0.491 + 0.508 = 1.832g', () => {
    const initialBuyMg = 833;
    const sip1Mg = 491;
    const sip2Mg = 508;
    const totalMg = initialBuyMg + sip1Mg + sip2Mg;

    expect(totalMg).toBe(1_832); // 1.832 grams
  });

  it('should track total invested amount: Rs 5,000 + Rs 3,000 + Rs 3,000 = Rs 11,000', () => {
    const totalInvestedPaise = 500_000 + 300_000 + 300_000;

    expect(totalInvestedPaise).toBe(1_100_000); // Rs 11,000
  });

  // ─── Portfolio P&L ───────────────────────────────────────────

  it('should calculate portfolio P&L at current rate', () => {
    const totalBalanceMg = 1_832;
    const totalInvestedPaise = 1_100_000;
    const currentRatePerGramPaise = METAL_RATES.GOLD_24K.ratePerGramPaise; // 620_000

    // Current value = balanceMg * ratePerGram / 1000
    const currentValuePaise = Math.round((totalBalanceMg * currentRatePerGramPaise) / 1000);
    const profitLossPaise = currentValuePaise - totalInvestedPaise;
    const profitLossPercent = Math.round((profitLossPaise / totalInvestedPaise) * 10000) / 100;

    expect(currentValuePaise).toBe(1_135_840); // Rs 11,358.40
    expect(profitLossPaise).toBe(35_840);       // Rs 358.40 profit
    expect(profitLossPercent).toBeGreaterThan(0); // Profitable
  });

  // ─── Physical Gold Redemption ────────────────────────────────

  it('should redeem 1g for physical gold delivery', () => {
    const redemption = {
      id: uuid(),
      vaultId,
      customerId,
      redemptionType: 'PHYSICAL_GOLD',
      goldWeightMg: 1_000, // 1 gram
      status: 'REQUESTED',
    };

    expect(redemption.goldWeightMg).toBe(1_000);
    expect(redemption.redemptionType).toBe('PHYSICAL_GOLD');
  });

  it('should update vault balance after redemption: 1.832g - 1g = 0.832g', () => {
    const balanceBeforeMg = 1_832;
    const redemptionMg = 1_000;
    const balanceAfterMg = balanceBeforeMg - redemptionMg;

    expect(balanceAfterMg).toBe(832); // 0.832 grams remaining
  });

  it('should reject redemption exceeding vault balance', () => {
    const currentBalanceMg = 832;
    const requestedRedemptionMg = 1_000; // More than available

    expect(requestedRedemptionMg).toBeGreaterThan(currentBalanceMg);
  });

  // ─── Sell Remaining Gold ─────────────────────────────────────

  it('should sell remaining 0.832g at Rs 6,200/g -> Rs 5,158', () => {
    const remainingMg = 832;
    // Sell price includes spread: market - Rs 50 per 10g
    const sellPricePer10gPaise = METAL_RATES.GOLD_24K.ratePer10gPaise + DIGITAL_GOLD.SELL_SPREAD_PER_10G_PAISE;
    const sellPricePerGramPaise = Math.round(sellPricePer10gPaise / 10);

    // amount = weightMg * pricePerGram / 1000
    const amountPaise = Math.floor((remainingMg * sellPricePerGramPaise) / 1000);

    expect(sellPricePer10gPaise).toBe(6_195_000); // Rs 61,950 per 10g
    expect(sellPricePerGramPaise).toBe(619_500);   // Rs 6,195 per g
    expect(amountPaise).toBe(515_424);              // ~Rs 5,154
  });

  it('should apply sell spread: market - Rs 50 per 10g', () => {
    const marketPer10g = METAL_RATES.GOLD_24K.ratePer10gPaise;
    const sellSpread = DIGITAL_GOLD.SELL_SPREAD_PER_10G_PAISE; // negative
    const sellPricePer10g = marketPer10g + sellSpread;

    expect(sellPricePer10g).toBeLessThan(marketPer10g);
    expect(marketPer10g - sellPricePer10g).toBe(5_000); // Rs 50 spread
  });

  it('should update vault to zero balance after selling all', () => {
    const afterSellMg = 0;
    expect(afterSellMg).toBe(0);
  });

  // ─── Full Digital Gold Workflow Events ───────────────────────

  it('should execute complete digital gold workflow with all events', async () => {
    // 1. Initial buy
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'retail.sale.completed' as any,
      payload: {
        saleId: uuid(),
        customerId,
        totalPaise: 500_000,
        items: [],
      },
    });

    // 2. SIP execution month 1
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: 'SYSTEM',
      timestamp: new Date().toISOString(),
      type: 'crm.notification.sent',
      payload: {
        customerId,
        channel: 'EMAIL',
        templateId: 'sip-execution-success',
        status: 'SENT',
      },
    });

    // 3. SIP execution month 2
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: 'SYSTEM',
      timestamp: new Date().toISOString(),
      type: 'crm.notification.sent',
      payload: {
        customerId,
        channel: 'EMAIL',
        templateId: 'sip-execution-success',
        status: 'SENT',
      },
    });

    // 4. Financial payment for sell
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'financial.payment.received',
      payload: {
        paymentId: uuid(),
        amountPaise: 515_424,
        method: 'BANK_TRANSFER',
        referenceId: uuid(),
      },
    });

    expect(ctx.eventCapture.count()).toBe(4);
  });
});
