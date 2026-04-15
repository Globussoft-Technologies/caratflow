// ─── CaratFlow Domain Events ───────────────────────────────────
// All domain events follow a consistent structure. Each event
// carries the tenant context and a typed payload.

export interface DomainEventBase {
  id: string;
  tenantId: string;
  userId: string;
  timestamp: string; // ISO 8601
  correlationId?: string;
}

// ─── Inventory Events ──────────────────────────────────────────

export interface InventoryStockAdjustedEvent extends DomainEventBase {
  type: 'inventory.stock.adjusted';
  payload: { productId: string; locationId: string; quantityChange: number; reason: string };
}

export interface InventoryItemCreatedEvent extends DomainEventBase {
  type: 'inventory.item.created';
  payload: { productId: string; locationId: string; quantity: number };
}

export interface InventoryItemUpdatedEvent extends DomainEventBase {
  type: 'inventory.item.updated';
  payload: { productId: string; changes: Record<string, unknown> };
}

export interface InventoryTransferCompletedEvent extends DomainEventBase {
  type: 'inventory.transfer.completed';
  payload: { transferId: string; fromLocationId: string; toLocationId: string; items: Array<{ productId: string; quantity: number }> };
}

// ─── Manufacturing Events ──────────────────────────────────────

export interface ManufacturingJobCreatedEvent extends DomainEventBase {
  type: 'manufacturing.job.created';
  payload: { jobOrderId: string; productType: string; estimatedCompletionDate: string };
}

export interface ManufacturingJobCompletedEvent extends DomainEventBase {
  type: 'manufacturing.job.completed';
  payload: { jobOrderId: string; outputProductId: string; actualWeightMg: number };
}

export interface ManufacturingJobCostedEvent extends DomainEventBase {
  type: 'manufacturing.job.costed';
  payload: { jobOrderId: string; totalCostPaise: number; breakdown: Record<string, number> };
}

export interface ManufacturingMaterialRequisitionedEvent extends DomainEventBase {
  type: 'manufacturing.material.requisitioned';
  payload: { jobOrderId: string; materials: Array<{ productId: string; quantityMg: number }> };
}

// ─── Retail Events ─────────────────────────────────────────────

export interface RetailSaleCompletedEvent extends DomainEventBase {
  type: 'retail.sale.completed';
  payload: { saleId: string; customerId: string; totalPaise: number; items: Array<{ productId: string; pricePaise: number }> };
}

export interface RetailReturnProcessedEvent extends DomainEventBase {
  type: 'retail.return.processed';
  payload: { returnId: string; originalSaleId: string; refundPaise: number };
}

export interface RetailCustomOrderCreatedEvent extends DomainEventBase {
  type: 'retail.custom_order.created';
  payload: { orderId: string; customerId: string; description: string; estimatePaise: number };
}

export interface RetailRepairCreatedEvent extends DomainEventBase {
  type: 'retail.repair.created';
  payload: { repairId: string; customerId: string; description: string };
}

// ─── Financial Events ──────────────────────────────────────────

export interface FinancialPaymentReceivedEvent extends DomainEventBase {
  type: 'financial.payment.received';
  payload: { paymentId: string; amountPaise: number; method: string; referenceId: string };
}

export interface FinancialInvoiceCreatedEvent extends DomainEventBase {
  type: 'financial.invoice.created';
  payload: { invoiceId: string; invoiceNumber: string; totalPaise: number; customerId: string };
}

export interface FinancialGstComputedEvent extends DomainEventBase {
  type: 'financial.gst.computed';
  payload: { invoiceId: string; cgstPaise: number; sgstPaise: number; igstPaise: number; cessPaise: number };
}

// ─── CRM Events ────────────────────────────────────────────────

export interface CrmCustomerCreatedEvent extends DomainEventBase {
  type: 'crm.customer.created';
  payload: { customerId: string; firstName: string; lastName: string; phone?: string };
}

export interface CrmCustomerUpdatedEvent extends DomainEventBase {
  type: 'crm.customer.updated';
  payload: { customerId: string; changes: Record<string, unknown> };
}

export interface CrmLoyaltyPointsEarnedEvent extends DomainEventBase {
  type: 'crm.loyalty.points_earned';
  payload: { customerId: string; points: number; source: string; referenceId: string };
}

export interface CrmNotificationSentEvent extends DomainEventBase {
  type: 'crm.notification.sent';
  payload: { customerId: string; channel: string; templateId: string; status: string };
}

export interface CrmConsultationRequestedEvent extends DomainEventBase {
  type: 'crm.consultation.requested';
  payload: { consultationId: string; customerId: string };
}

export interface CrmConsultationScheduledEvent extends DomainEventBase {
  type: 'crm.consultation.scheduled';
  payload: { consultationId: string; customerId: string; consultantId: string; scheduledAt: string; meetingUrl: string };
}

// ─── Wholesale Events ──────────────────────────────────────────

export interface WholesalePurchaseCompletedEvent extends DomainEventBase {
  type: 'wholesale.purchase.completed';
  payload: { purchaseOrderId: string; supplierId: string; totalPaise: number };
}

export interface WholesaleConsignmentCreatedEvent extends DomainEventBase {
  type: 'wholesale.consignment.created';
  payload: { consignmentId: string; supplierId: string; items: Array<{ productId: string; weightMg: number }> };
}

export interface WholesaleConsignmentReturnedEvent extends DomainEventBase {
  type: 'wholesale.consignment.returned';
  payload: { consignmentId: string; returnedItems: Array<{ productId: string; weightMg: number }> };
}

// ─── Compliance Events ─────────────────────────────────────────

export interface ComplianceHuidRegisteredEvent extends DomainEventBase {
  type: 'compliance.huid.registered';
  payload: { productId: string; huidNumber: string };
}

export interface ComplianceHallmarkVerifiedEvent extends DomainEventBase {
  type: 'compliance.hallmark.verified';
  payload: { productId: string; hallmarkNumber: string; purity: number };
}

// ─── Export Events ─────────────────────────────────────────────

export interface ExportOrderCreatedEvent extends DomainEventBase {
  type: 'export.order.created';
  payload: { exportOrderId: string; buyerId: string; buyerCountry: string; totalPaise: number };
}

export interface ExportOrderShippedEvent extends DomainEventBase {
  type: 'export.order.shipped';
  payload: { exportOrderId: string; orderNumber: string; buyerCountry: string };
}

export interface ExportOrderDeliveredEvent extends DomainEventBase {
  type: 'export.order.delivered';
  payload: { exportOrderId: string; orderNumber: string; totalPaise: number };
}

export interface ExportInvoiceCreatedEvent extends DomainEventBase {
  type: 'export.invoice.created';
  payload: { invoiceId: string; invoiceNumber: string; exportOrderId: string; totalPaise: number };
}

export interface ExportDocumentIssuedEvent extends DomainEventBase {
  type: 'export.document.issued';
  payload: { documentId: string; documentType: string; exportOrderId: string };
}

// ─── Pre-Order Events ─────────────────────────────────────────

export interface PreOrderCreatedEvent extends DomainEventBase {
  type: 'preorder.created';
  payload: { preOrderId: string; customerId: string; productId: string; orderType: string };
}

export interface PreOrderFulfilledEvent extends DomainEventBase {
  type: 'preorder.fulfilled';
  payload: { preOrderId: string; customerId: string; productId: string; fulfilledOrderId: string };
}

export interface PreOrderCancelledEvent extends DomainEventBase {
  type: 'preorder.cancelled';
  payload: { preOrderId: string; customerId: string; productId: string; reason: string };
}

export interface PreOrderAvailableEvent extends DomainEventBase {
  type: 'preorder.available';
  payload: { preOrderId: string; customerId: string; productId: string };
}

// ─── E-Commerce Events ─────────────────────────────────────────

export interface EcommerceOrderReceivedEvent extends DomainEventBase {
  type: 'ecommerce.order.received';
  payload: { orderId: string; channel: string; totalPaise: number; customerEmail: string };
}

export interface EcommerceOrderSyncedEvent extends DomainEventBase {
  type: 'ecommerce.order.synced';
  payload: { orderId: string; externalOrderId: string; channel: string; status: string };
}

// ─── Storefront Events ────────────────────────────────────────

export interface StorefrontOrderPlacedEvent extends DomainEventBase {
  type: 'storefront.order.placed';
  payload: { orderId: string; customerId: string; totalPaise: number; itemCount: number };
}

export interface StorefrontOrderCompletedEvent extends DomainEventBase {
  type: 'storefront.order.completed';
  payload: { orderId: string; customerId: string; totalPaise: number };
}

export interface StorefrontCartAbandonedEvent extends DomainEventBase {
  type: 'storefront.cart.abandoned';
  payload: { cartId: string; customerId: string | null; email: string | null; totalPaise: number; itemCount: number };
}

// ─── B2C Features Events ──────────────────────────────────────

export interface B2cPriceAlertTriggeredEvent extends DomainEventBase {
  type: 'b2c.price_alert.triggered';
  payload: { customerId: string; productId: string; thresholdPaise: number; currentPricePaise: number };
}

export interface B2cBackInStockNotifiedEvent extends DomainEventBase {
  type: 'b2c.back_in_stock.notified';
  payload: { productId: string; subscriberCount: number };
}

export interface B2cAbandonedCartDetectedEvent extends DomainEventBase {
  type: 'b2c.abandoned_cart.detected';
  payload: { cartId: string; customerId: string | null; totalPaise: number; itemCount: number };
}

export interface B2cAbandonedCartRecoveredEvent extends DomainEventBase {
  type: 'b2c.abandoned_cart.recovered';
  payload: { cartId: string; orderId: string; totalPaise: number };
}

export interface B2cCouponUsedEvent extends DomainEventBase {
  type: 'b2c.coupon.used';
  payload: { couponId: string; couponCode: string; customerId: string; orderId: string; discountPaise: number };
}

// ─── Referral Events ──────────────────────────────────────────

export interface CrmReferralCompletedEvent extends DomainEventBase {
  type: 'crm.referral.completed';
  payload: { referralId: string; referrerId: string; refereeId: string; referrerRewardPaise: number; refereeRewardPaise: number; orderId: string };
}

// ─── AML Events ───────────────────────────────────────────────

export interface ComplianceAmlAlertCreatedEvent extends DomainEventBase {
  type: 'compliance.aml.alert_created';
  payload: { alertId: string; customerId: string; alertType: string; severity: string; amountPaise: number };
}

export interface ComplianceAmlAlertEscalatedEvent extends DomainEventBase {
  type: 'compliance.aml.alert_escalated';
  payload: { alertId: string; customerId: string; severity: string };
}

// ─── Platform Events ───────────────────────────────────────────

export interface PlatformUserCreatedEvent extends DomainEventBase {
  type: 'platform.user.created';
  payload: { userId: string; email: string; roleId: string };
}

export interface PlatformBranchCreatedEvent extends DomainEventBase {
  type: 'platform.branch.created';
  payload: { locationId: string; name: string; locationType: string };
}

export interface PlatformSettingsUpdatedEvent extends DomainEventBase {
  type: 'platform.settings.updated';
  payload: { settingKey: string; oldValue: unknown; newValue: unknown };
}

// ─── Hardware Events ──────────────────────────────────────────

export interface HardwareScaleReadEvent extends DomainEventBase {
  type: 'hardware.scale.read';
  payload: { deviceId: string; weightMg: number; isStable: boolean };
}

export interface HardwareBarcodeScannedEvent extends DomainEventBase {
  type: 'hardware.barcode.scanned';
  payload: { deviceId?: string; barcode: string; productId: string | null };
}

export interface HardwareRfidScannedEvent extends DomainEventBase {
  type: 'hardware.rfid.scanned';
  payload: { deviceId: string; epc: string; serialNumberId: string | null };
}

export interface HardwareLabelPrintedEvent extends DomainEventBase {
  type: 'hardware.label.printed';
  payload: { templateId: string; productId: string; copies: number };
}

export interface HardwareBiometricEventReceivedEvent extends DomainEventBase {
  type: 'hardware.biometric.received';
  payload: { deviceId: string; employeeCode: string; eventType: 'CHECK_IN' | 'CHECK_OUT' };
}

export interface HardwareDeviceStatusChangedEvent extends DomainEventBase {
  type: 'hardware.device.status_changed';
  payload: { deviceId: string; status: string };
}

// ─── India Events (defined in india.ts, imported here for union) ──
// These are re-imported to keep the DomainEvent union complete.

import type {
  IndiaGirviLoanCreatedEvent,
  IndiaGirviPaymentReceivedEvent,
  IndiaGirviLoanClosedEvent,
  IndiaSchemeInstallmentDueEvent,
  IndiaMetalRateUpdatedEvent,
  IndiaKycVerifiedEvent,
  IndiaKycFailedEvent,
} from './india';

// ─── Digital Gold Events (defined in digital-gold.ts, imported here for union) ──

import type {
  DigitalGoldBoughtEvent,
  DigitalGoldSoldEvent,
  DigitalGoldSipExecutedEvent,
  DigitalGoldRedemptionRequestedEvent,
  DigitalGoldPriceAlertTriggeredEvent,
} from './digital-gold';

// ─── Union Type ────────────────────────────────────────────────

export type DomainEvent =
  // Inventory
  | InventoryStockAdjustedEvent
  | InventoryItemCreatedEvent
  | InventoryItemUpdatedEvent
  | InventoryTransferCompletedEvent
  // Manufacturing
  | ManufacturingJobCreatedEvent
  | ManufacturingJobCompletedEvent
  | ManufacturingJobCostedEvent
  | ManufacturingMaterialRequisitionedEvent
  // Retail
  | RetailSaleCompletedEvent
  | RetailReturnProcessedEvent
  | RetailCustomOrderCreatedEvent
  | RetailRepairCreatedEvent
  // Financial
  | FinancialPaymentReceivedEvent
  | FinancialInvoiceCreatedEvent
  | FinancialGstComputedEvent
  // CRM
  | CrmCustomerCreatedEvent
  | CrmCustomerUpdatedEvent
  | CrmLoyaltyPointsEarnedEvent
  | CrmNotificationSentEvent
  | CrmConsultationRequestedEvent
  | CrmConsultationScheduledEvent
  // Wholesale
  | WholesalePurchaseCompletedEvent
  | WholesaleConsignmentCreatedEvent
  | WholesaleConsignmentReturnedEvent
  // Compliance
  | ComplianceHuidRegisteredEvent
  | ComplianceHallmarkVerifiedEvent
  // Export
  | ExportOrderCreatedEvent
  | ExportOrderShippedEvent
  | ExportOrderDeliveredEvent
  | ExportInvoiceCreatedEvent
  | ExportDocumentIssuedEvent
  // Pre-Order
  | PreOrderCreatedEvent
  | PreOrderFulfilledEvent
  | PreOrderCancelledEvent
  | PreOrderAvailableEvent
  // E-Commerce
  | EcommerceOrderReceivedEvent
  | EcommerceOrderSyncedEvent
  // Storefront
  | StorefrontOrderPlacedEvent
  | StorefrontOrderCompletedEvent
  | StorefrontCartAbandonedEvent
  // Platform
  | PlatformUserCreatedEvent
  | PlatformBranchCreatedEvent
  | PlatformSettingsUpdatedEvent
  // B2C Features
  | B2cPriceAlertTriggeredEvent
  | B2cBackInStockNotifiedEvent
  | B2cAbandonedCartDetectedEvent
  | B2cAbandonedCartRecoveredEvent
  | B2cCouponUsedEvent
  // India
  | IndiaGirviLoanCreatedEvent
  | IndiaGirviPaymentReceivedEvent
  | IndiaGirviLoanClosedEvent
  | IndiaSchemeInstallmentDueEvent
  | IndiaMetalRateUpdatedEvent
  | IndiaKycVerifiedEvent
  | IndiaKycFailedEvent
  // Digital Gold
  | DigitalGoldBoughtEvent
  | DigitalGoldSoldEvent
  | DigitalGoldSipExecutedEvent
  | DigitalGoldRedemptionRequestedEvent
  | DigitalGoldPriceAlertTriggeredEvent
  // Referral
  | CrmReferralCompletedEvent
  // AML
  | ComplianceAmlAlertCreatedEvent
  | ComplianceAmlAlertEscalatedEvent
  // Hardware
  | HardwareScaleReadEvent
  | HardwareBarcodeScannedEvent
  | HardwareRfidScannedEvent
  | HardwareLabelPrintedEvent
  | HardwareBiometricEventReceivedEvent
  | HardwareDeviceStatusChangedEvent;

export type DomainEventType = DomainEvent['type'];

// ─── Realtime Broadcast Whitelist ──────────────────────────────
// Event types in this set are safe to broadcast via the public
// tenant-scoped WebSocket gateway. Only public state changes with
// non-sensitive payloads should be listed here. Any event carrying
// payment details, KYC data, PII, or auth-related information must
// be excluded (default behavior).
export const BROADCASTABLE_EVENT_TYPES: ReadonlySet<DomainEventType> = new Set<DomainEventType>([
  'inventory.stock.adjusted',
  'inventory.item.created',
  'inventory.item.updated',
  'inventory.transfer.completed',
  'retail.sale.completed',
  'manufacturing.job.created',
  'manufacturing.job.completed',
  'crm.customer.updated',
  'wholesale.purchase.completed',
  'compliance.huid.registered',
]);

/** Returns true if the given event type is safe to broadcast to tenant clients. */
export function isBroadcastableEventType(type: DomainEventType): boolean {
  return BROADCASTABLE_EVENT_TYPES.has(type);
}
