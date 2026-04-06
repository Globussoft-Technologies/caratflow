import { describe, it, expect, beforeEach } from 'vitest';
import { HardwareDisplayService } from '../hardware.display.service';

describe('HardwareDisplayService (Unit)', () => {
  let service: HardwareDisplayService;
  const tenantId = 'test-tenant';

  beforeEach(() => {
    service = new HardwareDisplayService();
  });

  describe('sendMessage', () => {
    it('truncates line1 to 20 characters', () => {
      const result = service.sendMessage(tenantId, {
        line1: 'A very long product name that exceeds twenty characters',
        deviceId: 'vfd-1',
      });

      expect(result.line1.length).toBeLessThanOrEqual(20);
    });

    it('formats amount into line2 when no line2 provided', () => {
      const result = service.sendMessage(tenantId, {
        line1: 'Total',
        amount: 500000, // Rs 5,000
        deviceId: 'vfd-1',
      });

      expect(result.line2).toBeDefined();
      expect(result.line2).toContain('5,000');
    });
  });

  describe('formatProductMessage', () => {
    it('formats product name on line1 and price on line2', () => {
      const result = service.formatProductMessage('22K Gold Ring', 500000);
      expect(result.line1).toContain('22K Gold Ring');
      expect(result.line2).toContain('5,000');
    });

    it('truncates long product names', () => {
      const result = service.formatProductMessage('Extremely Long Product Name Here Today', 100);
      expect(result.line1.length).toBeLessThanOrEqual(20);
    });
  });

  describe('formatTotalMessage', () => {
    it('shows item count on line1 and total on line2', () => {
      const result = service.formatTotalMessage(3, 1500000);
      expect(result.line1).toContain('Items: 3');
      expect(result.line2).toContain('15,000');
    });
  });

  describe('formatFinalAmountMessage', () => {
    it('shows TOTAL AMOUNT on line1', () => {
      const result = service.formatFinalAmountMessage(250000);
      expect(result.line1).toBe('TOTAL AMOUNT');
      expect(result.line2).toContain('2,500');
    });
  });

  describe('formatThankYouMessage', () => {
    it('returns thank you and visit again', () => {
      const result = service.formatThankYouMessage();
      expect(result.line1).toBe('THANK YOU');
      expect(result.line2).toBe('VISIT AGAIN');
    });
  });

  describe('clearDisplay', () => {
    it('clears both lines', () => {
      service.sendMessage(tenantId, { line1: 'Hello', deviceId: 'vfd-1' });
      const result = service.clearDisplay(tenantId, 'vfd-1');
      expect(result.line1).toBe('');
      expect(result.line2).toBe('');
    });
  });

  describe('getLastMessage', () => {
    it('returns null when no message sent', () => {
      expect(service.getLastMessage(tenantId, 'no-device')).toBeNull();
    });

    it('returns the last sent message', () => {
      service.sendMessage(tenantId, { line1: 'Test', deviceId: 'vfd-1' });
      const result = service.getLastMessage(tenantId, 'vfd-1');
      expect(result).not.toBeNull();
      expect(result!.line1).toBe('Test');
    });
  });
});
