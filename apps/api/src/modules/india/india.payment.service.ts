// ─── India Payment Service ─────────────────────────────────────
// UPI QR generation, bank transfer templates, Razorpay placeholder.

import { Injectable, Logger } from '@nestjs/common';
import type {
  UpiPaymentInput,
  UpiQrData,
  BankTransferTemplateInput,
  BankTransferTemplate,
} from '@caratflow/shared-types';

@Injectable()
export class IndiaPaymentService {
  private readonly logger = new Logger(IndiaPaymentService.name);

  // ─── UPI Payment ─────────────────────────────────────────────

  /**
   * Generate UPI deep link / QR code data.
   * Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&tn=NOTE&tr=REF
   */
  generateUpiQrData(input: UpiPaymentInput): UpiQrData {
    const amountRupees = (input.amountPaise / 100).toFixed(2);
    const transactionNote = input.transactionNote ?? 'Payment to CaratFlow';
    const referenceId = input.referenceId ?? `CF${Date.now()}`;

    const params = new URLSearchParams({
      pa: input.payeeVpa,
      pn: input.payeeName,
      am: amountRupees,
      tn: transactionNote,
      tr: referenceId,
      cu: 'INR',
    });

    const upiUrl = `upi://pay?${params.toString()}`;

    return {
      upiUrl,
      payeeVpa: input.payeeVpa,
      payeeName: input.payeeName,
      amountRupees,
      transactionNote,
      referenceId,
    };
  }

  /**
   * Record a UPI payment callback.
   * In production, this would validate the callback from the UPI PSP
   * and update the payment status in the database.
   */
  async recordUpiCallback(transactionId: string, status: string, upiRefId: string): Promise<void> {
    this.logger.log(
      `UPI callback: txn=${transactionId}, status=${status}, upiRef=${upiRefId}`,
    );
    // Implementation would:
    // 1. Look up pending payment by transactionId/referenceId
    // 2. Validate callback signature (if using PSP webhook)
    // 3. Update payment status to COMPLETED/FAILED
    // 4. Emit financial.payment.received event if successful
  }

  // ─── Bank Transfer Templates ─────────────────────────────────

  /**
   * Generate bank transfer template with proper reference format.
   * NEFT: up to Rs. 50 lakh, 2-hour settlement
   * RTGS: above Rs. 2 lakh, real-time
   * IMPS: up to Rs. 5 lakh, instant
   */
  generateBankTransferTemplate(input: BankTransferTemplateInput): BankTransferTemplate {
    const amountRupees = (input.amountPaise / 100).toFixed(2);
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    let referenceFormat: string;
    switch (input.transferType) {
      case 'NEFT':
        referenceFormat = `NEFT/CF/${timestamp}/${Date.now().toString(36).toUpperCase()}`;
        break;
      case 'RTGS':
        referenceFormat = `RTGS/CF/${timestamp}/${Date.now().toString(36).toUpperCase()}`;
        break;
      case 'IMPS':
        referenceFormat = `IMPS/CF/${Date.now()}`;
        break;
      default:
        referenceFormat = `CF/${timestamp}/${Date.now()}`;
    }

    return {
      transferType: input.transferType,
      beneficiaryName: input.beneficiaryName,
      accountNumber: input.accountNumber,
      ifscCode: input.ifscCode,
      amountRupees,
      referenceFormat,
      remarks: input.remarks ?? `CaratFlow payment ${referenceFormat}`,
    };
  }

  /**
   * Validate IFSC code format.
   * Format: 4 alpha + 0 + 6 alphanumeric
   */
  validateIfsc(ifscCode: string): boolean {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode);
  }

  // ─── Razorpay Integration (placeholder) ──────────────────────

  /**
   * Placeholder for Razorpay payment gateway integration.
   * In production, this would:
   * 1. Create a Razorpay order
   * 2. Return order_id + key for client-side SDK
   * 3. Handle webhook for payment confirmation
   */
  async createRazorpayOrder(
    _amountPaise: number,
    _currency: string,
    _receipt: string,
  ): Promise<{ orderId: string; keyId: string; message: string }> {
    this.logger.log('Razorpay: placeholder - integrate with Razorpay API');
    return {
      orderId: `order_placeholder_${Date.now()}`,
      keyId: 'rzp_placeholder',
      message: 'Razorpay integration pending. Use UPI or bank transfer.',
    };
  }

  /**
   * Verify Razorpay payment signature.
   * Called after client-side payment completion.
   */
  async verifyRazorpayPayment(
    _orderId: string,
    _paymentId: string,
    _signature: string,
  ): Promise<{ verified: boolean; message: string }> {
    this.logger.log('Razorpay verification: placeholder');
    return {
      verified: false,
      message: 'Razorpay integration pending.',
    };
  }
}
