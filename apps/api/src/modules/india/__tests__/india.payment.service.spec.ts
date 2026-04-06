import { describe, it, expect, beforeEach } from 'vitest';
import { IndiaPaymentService } from '../india.payment.service';

describe('IndiaPaymentService (Unit)', () => {
  let service: IndiaPaymentService;

  beforeEach(() => {
    service = new IndiaPaymentService();
  });

  // ─── generateUpiQrData ──────────────────────────────────────────

  describe('generateUpiQrData', () => {
    it('generates UPI deep link in correct format', () => {
      const result = service.generateUpiQrData({
        payeeVpa: 'jeweler@upi',
        payeeName: 'CaratFlow Jewelers',
        amountPaise: 100000,
        transactionNote: 'Payment for ring',
      });

      expect(result.upiUrl).toContain('upi://pay?');
      expect(result.upiUrl).toContain('pa=jeweler%40upi');
      expect(result.upiUrl).toContain('am=1000.00');
      expect(result.upiUrl).toContain('cu=INR');
      expect(result.amountRupees).toBe('1000.00');
    });

    it('converts paise to rupees correctly', () => {
      const result = service.generateUpiQrData({
        payeeVpa: 'shop@upi',
        payeeName: 'Shop',
        amountPaise: 50050,
      });

      expect(result.amountRupees).toBe('500.50');
    });

    it('includes transaction note in URL', () => {
      const result = service.generateUpiQrData({
        payeeVpa: 'shop@upi',
        payeeName: 'Shop',
        amountPaise: 10000,
        transactionNote: 'Invoice #123',
      });

      expect(result.upiUrl).toContain('tn=');
      expect(result.transactionNote).toBe('Invoice #123');
    });

    it('uses default transaction note when not provided', () => {
      const result = service.generateUpiQrData({
        payeeVpa: 'shop@upi',
        payeeName: 'Shop',
        amountPaise: 10000,
      });

      expect(result.transactionNote).toBe('Payment to CaratFlow');
    });

    it('generates referenceId when not provided', () => {
      const result = service.generateUpiQrData({
        payeeVpa: 'shop@upi',
        payeeName: 'Shop',
        amountPaise: 10000,
      });

      expect(result.referenceId).toMatch(/^CF\d+$/);
    });

    it('uses provided referenceId', () => {
      const result = service.generateUpiQrData({
        payeeVpa: 'shop@upi',
        payeeName: 'Shop',
        amountPaise: 10000,
        referenceId: 'REF-001',
      });

      expect(result.referenceId).toBe('REF-001');
    });
  });

  // ─── generateBankTransferTemplate ───────────────────────────────

  describe('generateBankTransferTemplate', () => {
    const baseInput = {
      beneficiaryName: 'CaratFlow Jewelers',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      amountPaise: 5000000,
    };

    it('generates NEFT reference format', () => {
      const result = service.generateBankTransferTemplate({
        ...baseInput,
        transferType: 'NEFT',
      } as any);

      expect(result.transferType).toBe('NEFT');
      expect(result.referenceFormat).toMatch(/^NEFT\/CF\//);
      expect(result.amountRupees).toBe('50000.00');
    });

    it('generates RTGS reference format', () => {
      const result = service.generateBankTransferTemplate({
        ...baseInput,
        transferType: 'RTGS',
      } as any);

      expect(result.transferType).toBe('RTGS');
      expect(result.referenceFormat).toMatch(/^RTGS\/CF\//);
    });

    it('generates IMPS reference format', () => {
      const result = service.generateBankTransferTemplate({
        ...baseInput,
        transferType: 'IMPS',
      } as any);

      expect(result.transferType).toBe('IMPS');
      expect(result.referenceFormat).toMatch(/^IMPS\/CF\//);
    });

    it('uses custom remarks when provided', () => {
      const result = service.generateBankTransferTemplate({
        ...baseInput,
        transferType: 'NEFT',
        remarks: 'Custom payment note',
      } as any);

      expect(result.remarks).toBe('Custom payment note');
    });

    it('generates default remarks when not provided', () => {
      const result = service.generateBankTransferTemplate({
        ...baseInput,
        transferType: 'NEFT',
      } as any);

      expect(result.remarks).toContain('CaratFlow payment');
    });
  });

  // ─── validateIfsc ───────────────────────────────────────────────

  describe('validateIfsc', () => {
    it('validates correct IFSC code', () => {
      expect(service.validateIfsc('HDFC0001234')).toBe(true);
      expect(service.validateIfsc('SBIN0012345')).toBe(true);
    });

    it('rejects invalid IFSC code', () => {
      expect(service.validateIfsc('hdfc0001234')).toBe(false); // lowercase
      expect(service.validateIfsc('HDFC1001234')).toBe(false); // 5th char not 0
      expect(service.validateIfsc('HDF0001234')).toBe(false);  // too short
      expect(service.validateIfsc('HDFCC001234')).toBe(false); // too long
    });
  });

  // ─── Razorpay placeholder ───────────────────────────────────────

  describe('createRazorpayOrder', () => {
    it('returns placeholder response', async () => {
      const result = await service.createRazorpayOrder(10000, 'INR', 'receipt-1');

      expect(result.orderId).toContain('placeholder');
      expect(result.message).toContain('pending');
    });
  });
});
