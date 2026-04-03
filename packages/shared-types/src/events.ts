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

// ─── E-Commerce Events ─────────────────────────────────────────

export interface EcommerceOrderReceivedEvent extends DomainEventBase {
  type: 'ecommerce.order.received';
  payload: { orderId: string; channel: string; totalPaise: number; customerEmail: string };
}

export interface EcommerceOrderSyncedEvent extends DomainEventBase {
  type: 'ecommerce.order.synced';
  payload: { orderId: string; externalOrderId: string; channel: string; status: string };
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

// ─── India Events (defined in india.ts, imported here for union) ──
// These are re-imported to keep the DomainEvent union complete.

import type {
  IndiaGirviLoanCreatedEvent,
  IndiaGirviPaymentReceivedEvent,
  IndiaGirviLoanClosedEvent,
  IndiaSchemeInstallmentDueEvent,
  IndiaMetalRateUpdatedEvent,
} from './india';

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
  // E-Commerce
  | EcommerceOrderReceivedEvent
  | EcommerceOrderSyncedEvent
  // Platform
  | PlatformUserCreatedEvent
  | PlatformBranchCreatedEvent
  | PlatformSettingsUpdatedEvent
  // India
  | IndiaGirviLoanCreatedEvent
  | IndiaGirviPaymentReceivedEvent
  | IndiaGirviLoanClosedEvent
  | IndiaSchemeInstallmentDueEvent
  | IndiaMetalRateUpdatedEvent;

export type DomainEventType = DomainEvent['type'];
