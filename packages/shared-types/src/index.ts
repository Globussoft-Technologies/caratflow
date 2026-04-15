// ─── CaratFlow Shared Types ────────────────────────────────────
// Central re-export of all shared types, schemas, and enums.
//
// NOTE: A handful of names are defined in multiple domain modules.
// When a name conflict exists, the later `export *` would cause a
// TS2308 ambiguity. To avoid this, the conflicting names are ONLY
// re-exported from the later module via explicit named re-export,
// while the wildcard re-export for that module is omitted.
//
// Current conflicts:
//   - InvoiceType: enums.ts and financial.ts
//     -> financial.InvoiceType re-exported as FinancialInvoiceType
//   - PaymentResponse / PaymentResponseSchema: financial.ts and ecommerce.ts
//     -> ecommerce versions re-exported as EcommercePaymentResponse
//   - AbandonedCartStatus(Enum), CouponCodeInput(Schema),
//     CouponDiscountType(Enum), CouponValidationResult(Schema),
//     PriceAlertInput(Schema): storefront.ts and b2c-features.ts
//     -> b2c-features versions win via wildcard; storefront omits them
//        (the storefront wildcard is replaced with explicit re-exports).
//   - ReturnRequestInput(Schema): storefront.ts and customer-portal.ts
//     -> customer-portal wins; storefront explicit list omits it.

export * from './auth';
export * from './common';
export * from './enums';
export * from './events';
export * from './inventory';
export * from './manufacturing';

// Financial: re-export everything except the conflicting `InvoiceType`
// (which is intentionally kept on `./enums`) and the `PaymentResponse*`
// names (which are re-exported from `./ecommerce` via wildcard below).
export {
  InvoiceStatus,
  PaymentType,
  FinPaymentMethod,
  FinPaymentStatus,
  TaxType,
  JournalEntryStatus,
  FinancialYearStatusEnum,
  JournalEntryLineInputSchema,
  JournalEntryInputSchema,
  JournalEntryLineResponseSchema,
  JournalEntryResponseSchema,
  JournalEntryListInputSchema,
  InvoiceLineInputSchema,
  InvoiceInputSchema,
  InvoiceLineResponseSchema,
  InvoiceResponseSchema,
  InvoiceListInputSchema,
  PaymentInputSchema,
  PaymentListInputSchema,
  GstComputationInputSchema,
  BankAccountInputSchema,
  BankTransactionInputSchema,
  BankReconciliationInputSchema,
  ImportStatementInputSchema,
  TaxReportInputSchema,
  FinancialYearInputSchema,
  CostCenterInputSchema,
  BudgetInputSchema,
  InvoiceType as FinancialInvoiceType,
} from './financial';
export type {
  JournalEntryLineInput,
  JournalEntryInput,
  JournalEntryResponse,
  JournalEntryListInput,
  InvoiceLineInput,
  InvoiceInput,
  InvoiceResponse,
  InvoiceListInput,
  PaymentInput,
  PaymentListInput,
  GstComputationInput,
  GstComputationResult,
  BankAccountInput,
  BankTransactionInput,
  BankReconciliationInput,
  ImportStatementInput,
  AccountBalance,
  TrialBalanceReport,
  ProfitAndLossReport,
  BalanceSheetReport,
  LedgerEntry,
  LedgerReport,
  CashFlowReport,
  AgingBucket,
  AgingReport,
  TaxReportInput,
  Gstr1HsnSummary,
  Gstr1Data,
  Gstr3bData,
  FinancialDashboardResponse,
  FinancialYearInput,
  CostCenterInput,
  BudgetInput,
  NicTranDtls,
  NicDocDtls,
  NicPartyDtls,
  NicItemDtls,
  NicValDtls,
  NicInvoicePayload,
  NicIrnStatus,
  NicIrnResponse,
  NicCancelResponse,
  NicIrnDetails,
} from './financial';

export * from './retail';
export * from './crm';
export * from './wholesale';
export * from './compliance';
export * from './export';
export * from './ecommerce';
export * from './reporting';
export * from './india';
export * from './hardware';

// Storefront: exclude `AbandonedCartStatus`, `AbandonedCartStatusEnum`,
// `CouponCodeInput`, `CouponCodeInputSchema`, `CouponDiscountType`,
// `CouponDiscountTypeEnum`, `CouponValidationResult`,
// `CouponValidationResultSchema`, `PriceAlertInput`, `PriceAlertInputSchema`
// (defined in `./b2c-features`) and `ReturnRequestInput`,
// `ReturnRequestInputSchema` (defined in `./customer-portal`).
export {
  PriceAlertStatus,
  PriceAlertStatusEnum,
  ProductListInputSchema,
  ReviewSummarySchema,
  CatalogProductResponseSchema,
  CartItemInputSchema,
  UpdateCartItemInputSchema,
  CartItemResponseSchema,
  CartResponseSchema,
  WishlistInputSchema,
  WishlistItemResponseSchema,
  WishlistResponseSchema,
  AddressInputSchema,
  AddressResponseSchema,
  CheckoutInputSchema,
  StorefrontOrderItemSchema,
  StorefrontShipmentSchema,
  StorefrontPaymentSchema,
  OrderResponseSchema,
  ReviewInputSchema,
  ReviewResponseSchema,
  ReviewListInputSchema,
  CouponValidationInputSchema,
  CouponCodeResponseSchema,
  StorefrontCategorySchema,
  LiveRateSchema,
  StorefrontHomeResponseSchema,
  ProductCompareInputSchema,
  ProductCompareResponseSchema,
} from './storefront';
export type {
  ProductListInput,
  ReviewSummary,
  CatalogProductResponse,
  CartItemInput,
  UpdateCartItemInput,
  CartItemResponse,
  CartResponse,
  WishlistInput,
  WishlistItemResponse,
  WishlistResponse,
  AddressInput,
  AddressResponse,
  CheckoutInput,
  StorefrontOrderItem,
  StorefrontShipment,
  StorefrontPayment,
  OrderResponse,
  ReviewInput,
  ReviewResponse,
  ReviewListInput,
  CouponValidationInput,
  CouponCodeResponse,
  StorefrontCategory,
  LiveRate,
  StorefrontHomeResponse,
  ProductCompareInput,
  ProductCompareResponse,
} from './storefront';

export * from './cms';
export * from './b2c-features';
export * from './referral-aml';
export * from './preorder';
export * from './customer-portal';
export * from './digital-gold';
export * from './bnpl';
export * from './chatbot';
export * from './ar';
export * from './search';
export * from './recommendations';
export * from './platform';
export * from './payroll';
