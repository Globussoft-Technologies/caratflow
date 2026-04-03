// ─── CaratFlow Shared Enums ────────────────────────────────────
// All enums used across multiple domains live here.
// Domain-specific enums that are only used within one module
// should stay in that module's types file.

export enum ProductType {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
  GEMSTONE = 'GEMSTONE',
  KUNDAN = 'KUNDAN',
  OTHER = 'OTHER',
}

export enum MetalType {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
  PALLADIUM = 'PALLADIUM',
  RHODIUM = 'RHODIUM',
}

export enum CustomerType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  CORPORATE = 'CORPORATE',
}

export enum LocationType {
  SHOWROOM = 'SHOWROOM',
  WAREHOUSE = 'WAREHOUSE',
  WORKSHOP = 'WORKSHOP',
  OFFICE = 'OFFICE',
}

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  CREDIT = 'CREDIT',
  OLD_GOLD = 'OLD_GOLD',
  OLD_SILVER = 'OLD_SILVER',
  MIXED = 'MIXED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum WeightUnit {
  MILLIGRAM = 'mg',
  GRAM = 'g',
  KILOGRAM = 'kg',
  CARAT = 'ct',
  TOLA = 'tola',
  TROY_OUNCE = 'troy_oz',
  GRAIN = 'grain',
}

export enum PurityUnit {
  KARAT = 'K',
  FINENESS = 'fineness',
  PERCENTAGE = 'percentage',
}

export enum GstType {
  CGST = 'CGST',
  SGST = 'SGST',
  IGST = 'IGST',
  CESS = 'CESS',
}

export enum InvoiceType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  ESTIMATE = 'ESTIMATE',
}

export enum StockMovementType {
  INWARD = 'INWARD',
  OUTWARD = 'OUTWARD',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}

export enum JobOrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  QUALITY_CHECK = 'QUALITY_CHECK',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RepairStatus {
  RECEIVED = 'RECEIVED',
  ESTIMATED = 'ESTIMATED',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

export enum NotificationType {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  PUSH = 'PUSH',
}

export enum ConsignmentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PARTIAL_RETURN = 'PARTIAL_RETURN',
  RETURNED = 'RETURNED',
  SETTLED = 'SETTLED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
