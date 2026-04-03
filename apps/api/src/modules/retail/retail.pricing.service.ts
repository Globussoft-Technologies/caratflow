// ─── Retail Pricing Engine ─────────────────────────────────────
// Handles jewelry pricing: metal rate * weight + making + wastage + GST.

import { Injectable } from '@nestjs/common';
import type { SaleLineItemInput, PricingCalculation, DiscountValidation } from '@caratflow/shared-types';
import { IndianGstCalculator } from '@caratflow/utils';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';

interface TaxParams {
  sourceState: string;
  destinationState: string;
}

interface LineItemWithTax {
  item: SaleLineItemInput;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  lineTotalPaise: number;
}

@Injectable()
export class RetailPricingService extends TenantAwareService {
  private readonly gstCalc = new IndianGstCalculator();

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Calculate price for a single line item based on metal rate, weight,
   * making charges, and wastage.
   * Formula: (metalRatePaisePerGram * weightInGrams) + makingCharges + wastageCharges
   */
  calculateLineItemPrice(
    metalRatePaisePerGram: number,
    metalWeightMg: number,
    makingChargesPaise: number,
    wastageChargesPaise: number,
    quantity: number,
  ): PricingCalculation {
    // Convert mg to grams for calculation, then back to paise
    const weightInGrams = metalWeightMg / 1000;
    const metalValuePaise = Math.round(metalRatePaisePerGram * weightInGrams);

    const subtotalPaise = (metalValuePaise + makingChargesPaise + wastageChargesPaise) * quantity;

    return {
      metalRatePaisePerGram,
      metalWeightMg,
      metalValuePaise,
      makingChargesPaise,
      wastageChargesPaise,
      subtotalPaise,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      totalTaxPaise: 0,
      totalPaise: subtotalPaise,
    };
  }

  /**
   * Calculate GST for a set of line items.
   * Jewelry HSN 7113 = 3% GST.
   * Making charges = 5% GST (computed separately if broken out).
   * Intra-state: CGST + SGST. Inter-state: IGST.
   */
  calculateTax(
    lineItems: SaleLineItemInput[],
    taxParams: TaxParams,
  ): LineItemWithTax[] {
    const isInterState = IndianGstCalculator.isInterState(
      taxParams.sourceState,
      taxParams.destinationState,
    );

    return lineItems.map((item) => {
      // Calculate taxable amount: unit price * quantity - discount
      const baseAmount = Number(item.unitPricePaise) * item.quantity;
      const discountAmount = Number(item.discountPaise ?? 0);
      const taxableAmount = baseAmount - discountAmount;

      // GST rate from item (stored as percent * 100, e.g. 300 = 3%)
      const gstRatePercent = (item.gstRate ?? 300) / 100;

      let cgstPaise = 0;
      let sgstPaise = 0;
      let igstPaise = 0;

      if (isInterState) {
        igstPaise = Math.round((taxableAmount * gstRatePercent) / 100);
      } else {
        const halfRate = gstRatePercent / 2;
        cgstPaise = Math.round((taxableAmount * halfRate) / 100);
        sgstPaise = Math.round((taxableAmount * halfRate) / 100);
      }

      const totalTax = cgstPaise + sgstPaise + igstPaise;
      const lineTotalPaise = taxableAmount + totalTax;

      return {
        item,
        cgstPaise,
        sgstPaise,
        igstPaise,
        lineTotalPaise,
      };
    });
  }

  /**
   * Apply a discount to line items. Validates the discount rules first.
   */
  async applyDiscount(
    tenantId: string,
    discountId: string,
    subtotalPaise: number,
    productIds: string[],
  ): Promise<DiscountValidation> {
    const discount = await this.prisma.discount.findFirst({
      where: this.tenantWhere(tenantId, { id: discountId }),
    });

    if (!discount) {
      return { discountId, isValid: false, applicableAmount: 0, reason: 'Discount not found' };
    }

    const now = new Date();
    if (!discount.isActive || now < discount.startDate || now > discount.endDate) {
      return { discountId, isValid: false, applicableAmount: 0, reason: 'Discount is inactive or expired' };
    }

    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return { discountId, isValid: false, applicableAmount: 0, reason: 'Discount usage limit reached' };
    }

    if (discount.minPurchasePaise && subtotalPaise < Number(discount.minPurchasePaise)) {
      return { discountId, isValid: false, applicableAmount: 0, reason: 'Minimum purchase amount not met' };
    }

    // Check applicable categories/products
    const applicableProducts = discount.applicableProducts as string[] | null;
    if (applicableProducts && applicableProducts.length > 0) {
      const hasApplicable = productIds.some((id) => applicableProducts.includes(id));
      if (!hasApplicable) {
        return { discountId, isValid: false, applicableAmount: 0, reason: 'No applicable products in cart' };
      }
    }

    let applicableAmount = 0;
    switch (discount.discountType) {
      case 'PERCENTAGE':
        applicableAmount = Math.round((subtotalPaise * discount.value) / 10000);
        break;
      case 'FIXED':
        applicableAmount = discount.value;
        break;
      case 'BUY_X_GET_Y':
        // Simplified: value represents the discount amount for the deal
        applicableAmount = discount.value;
        break;
    }

    // Cap at maximum discount if set
    if (discount.maxDiscountPaise && applicableAmount > Number(discount.maxDiscountPaise)) {
      applicableAmount = Number(discount.maxDiscountPaise);
    }

    return { discountId, isValid: true, applicableAmount };
  }

  /**
   * Calculate the complete total for a sale: subtotal, discount, tax, roundoff, grand total.
   */
  calculateTotal(
    lineItemsWithTax: LineItemWithTax[],
    discountPaise: number,
  ): {
    subtotalPaise: number;
    discountPaise: number;
    taxPaise: number;
    roundOffPaise: number;
    totalPaise: number;
  } {
    let subtotalPaise = 0;
    let taxPaise = 0;

    for (const li of lineItemsWithTax) {
      const baseAmount = Number(li.item.unitPricePaise) * li.item.quantity;
      const itemDiscount = Number(li.item.discountPaise ?? 0);
      subtotalPaise += baseAmount - itemDiscount;
      taxPaise += li.cgstPaise + li.sgstPaise + li.igstPaise;
    }

    const beforeRoundOff = subtotalPaise - discountPaise + taxPaise;

    // Round to nearest rupee (100 paise)
    const roundedTotal = Math.round(beforeRoundOff / 100) * 100;
    const roundOffPaise = roundedTotal - beforeRoundOff;

    return {
      subtotalPaise,
      discountPaise,
      taxPaise,
      roundOffPaise,
      totalPaise: roundedTotal,
    };
  }
}
