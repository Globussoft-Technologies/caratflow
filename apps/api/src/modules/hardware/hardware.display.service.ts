// ─── Hardware Customer Display Service ────────────────────────
// Customer-facing display message formatting and control.

import { Injectable } from '@nestjs/common';
import type { CustomerDisplayMessage } from '@caratflow/shared-types';

/** In-memory last message per device (keyed by tenantId:deviceId) */
const lastMessages = new Map<string, CustomerDisplayMessage>();

@Injectable()
export class HardwareDisplayService {
  /**
   * Send a message to a customer-facing display device.
   * Formats the message for 2-line / 4-line character displays.
   */
  sendMessage(tenantId: string, message: CustomerDisplayMessage): CustomerDisplayMessage {
    const formatted: CustomerDisplayMessage = {
      line1: this.truncateLine(message.line1, 20),
      line2: message.line2 ? this.truncateLine(message.line2, 20) : undefined,
      amount: message.amount,
      deviceId: message.deviceId,
    };

    // If amount is provided, format it for line2
    if (formatted.amount !== undefined && !formatted.line2) {
      formatted.line2 = this.formatAmountLine(formatted.amount);
    }

    const key = `${tenantId}:${message.deviceId}`;
    lastMessages.set(key, formatted);

    return formatted;
  }

  /**
   * Clear the customer display.
   */
  clearDisplay(tenantId: string, deviceId: string): CustomerDisplayMessage {
    const key = `${tenantId}:${deviceId}`;
    const cleared: CustomerDisplayMessage = {
      line1: '',
      line2: '',
      deviceId,
    };
    lastMessages.set(key, cleared);
    return cleared;
  }

  /**
   * Get the last message sent to a display device.
   */
  getLastMessage(tenantId: string, deviceId: string): CustomerDisplayMessage | null {
    const key = `${tenantId}:${deviceId}`;
    return lastMessages.get(key) ?? null;
  }

  /**
   * Format a product scan message for the display.
   */
  formatProductMessage(productName: string, pricePaise: number): { line1: string; line2: string } {
    return {
      line1: this.truncateLine(productName, 20),
      line2: this.formatAmountLine(pricePaise),
    };
  }

  /**
   * Format a running total message for the display.
   */
  formatTotalMessage(itemCount: number, totalPaise: number): { line1: string; line2: string } {
    return {
      line1: this.truncateLine(`Items: ${itemCount}`, 20),
      line2: this.formatAmountLine(totalPaise),
    };
  }

  /**
   * Format a final sale amount message.
   */
  formatFinalAmountMessage(totalPaise: number): { line1: string; line2: string } {
    return {
      line1: 'TOTAL AMOUNT',
      line2: this.formatAmountLine(totalPaise),
    };
  }

  /**
   * Format a thank you / welcome message.
   */
  formatThankYouMessage(): { line1: string; line2: string } {
    return {
      line1: 'THANK YOU',
      line2: 'VISIT AGAIN',
    };
  }

  // ─── Private Helpers ────────────────────────────────────────

  private truncateLine(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + '...';
  }

  private formatAmountLine(paise: number): string {
    const rupees = paise / 100;
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(rupees);
    return this.truncateLine(formatted, 20);
  }
}
