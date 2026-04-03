// ─── CaratFlow Export & International Trade Types ───────────────
// Types for export orders, export invoices, shipping documents,
// customs duty, HS codes, exchange rates, DGFT licenses, and compliance.

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────

export enum ExportOrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  READY = 'READY',
  CUSTOMS_CLEARED = 'CUSTOMS_CLEARED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum ExportInvoiceType {
  COMMERCIAL = 'COMMERCIAL',
  PROFORMA = 'PROFORMA',
  CUSTOMS = 'CUSTOMS',
}

export enum ShippingDocumentType {
  PACKING_LIST = 'PACKING_LIST',
  SHIPPING_BILL = 'SHIPPING_BILL',
  BILL_OF_LADING = 'BILL_OF_LADING',
  AIRWAY_BILL = 'AIRWAY_BILL',
  CERTIFICATE_OF_ORIGIN = 'CERTIFICATE_OF_ORIGIN',
  ARE1 = 'ARE1',
  ARE3 = 'ARE3',
  FORM_A = 'FORM_A',
  GR_FORM = 'GR_FORM',
  SOFTEX = 'SOFTEX',
  INSURANCE_CERTIFICATE = 'INSURANCE_CERTIFICATE',
  INSPECTION_CERTIFICATE = 'INSPECTION_CERTIFICATE',
}

export enum ShippingDocumentStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
}

export enum DgftLicenseType {
  ADVANCE_LICENSE = 'ADVANCE_LICENSE',
  DFIA = 'DFIA',
  EPCG = 'EPCG',
  MEIS = 'MEIS',
  RODTEP = 'RODTEP',
}

export enum DgftLicenseStatus {
  ACTIVE = 'ACTIVE',
  UTILIZED = 'UTILIZED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ExchangeRateSource {
  RBI = 'RBI',
  MANUAL = 'MANUAL',
  API = 'API',
}

export enum Incoterms {
  FOB = 'FOB',
  CIF = 'CIF',
  EXW = 'EXW',
  DDP = 'DDP',
}

// ─── Export Order Schemas ─────────────────────────────────────────

export const ExportOrderItemInputSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().int().positive(),
  unitPricePaise: z.number().int().nonnegative(),
  hsCode: z.string().min(4).max(10),
  weightMg: z.number().int().nonnegative(),
  metalPurity: z.number().int().min(0).max(999).optional(),
  countryOfOrigin: z.string().length(2).default('IN'),
});

export type ExportOrderItemInput = z.infer<typeof ExportOrderItemInputSchema>;

export const ExportOrderInputSchema = z.object({
  buyerId: z.string().uuid(),
  buyerCountry: z.string().length(2),
  locationId: z.string().uuid(),
  currencyCode: z.string().length(3).default('USD'),
  exchangeRate: z.number().int().positive(), // rate * 10000
  incoterms: z.nativeEnum(Incoterms),
  paymentTerms: z.string().min(1).max(255),
  items: z.array(ExportOrderItemInputSchema).min(1),
  shippingPaise: z.number().int().nonnegative().default(0),
  insurancePaise: z.number().int().nonnegative().default(0),
  expectedShipDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type ExportOrderInput = z.infer<typeof ExportOrderInputSchema>;

export const ExportOrderListFilterSchema = z.object({
  status: z.nativeEnum(ExportOrderStatus).optional(),
  buyerId: z.string().uuid().optional(),
  buyerCountry: z.string().length(2).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});

export type ExportOrderListFilter = z.infer<typeof ExportOrderListFilterSchema>;

export interface ExportOrderItemResponse {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPricePaise: number;
  totalPricePaise: number;
  hsCode: string;
  weightMg: number;
  metalPurity: number | null;
  countryOfOrigin: string;
}

export interface ExportOrderResponse {
  id: string;
  tenantId: string;
  orderNumber: string;
  buyerId: string;
  buyerName?: string;
  buyerCountry: string;
  locationId: string;
  locationName?: string;
  status: ExportOrderStatus;
  currencyCode: string;
  exchangeRate: number;
  subtotalPaise: number;
  dutyPaise: number;
  shippingPaise: number;
  insurancePaise: number;
  totalPaise: number;
  incoterms: string;
  paymentTerms: string;
  notes: string | null;
  expectedShipDate: string | null;
  actualShipDate: string | null;
  items: ExportOrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

// ─── Export Invoice Schemas ───────────────────────────────────────

export const ExportInvoiceItemInputSchema = z.object({
  exportOrderItemId: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().int().positive(),
  unitPricePaise: z.number().int().nonnegative(),
  hsCode: z.string().min(4).max(10),
  weightMg: z.number().int().nonnegative(),
  netWeightMg: z.number().int().nonnegative(),
  countryOfOrigin: z.string().length(2).default('IN'),
});

export type ExportInvoiceItemInput = z.infer<typeof ExportInvoiceItemInputSchema>;

export const ExportInvoiceInputSchema = z.object({
  exportOrderId: z.string().uuid(),
  invoiceType: z.nativeEnum(ExportInvoiceType),
  buyerId: z.string().uuid(),
  currencyCode: z.string().length(3),
  exchangeRate: z.number().int().positive(),
  items: z.array(ExportInvoiceItemInputSchema).min(1),
  igstPaise: z.number().int().nonnegative().default(0),
  lutNumber: z.string().max(100).optional(),
  lutDate: z.coerce.date().optional(),
  adCode: z.string().max(20).optional(),
  ieCode: z.string().min(1).max(20),
  preCarriageBy: z.string().max(100).optional(),
  placeOfReceipt: z.string().max(255).optional(),
  vesselFlightNo: z.string().max(100).optional(),
  portOfLoading: z.string().max(255).optional(),
  portOfDischarge: z.string().max(255).optional(),
  finalDestination: z.string().max(255).optional(),
  terms: z.string().optional(),
});

export type ExportInvoiceInput = z.infer<typeof ExportInvoiceInputSchema>;

export interface ExportInvoiceItemResponse {
  id: string;
  exportOrderItemId: string | null;
  description: string;
  quantity: number;
  unitPricePaise: number;
  totalPricePaise: number;
  hsCode: string;
  weightMg: number;
  netWeightMg: number;
  countryOfOrigin: string;
}

export interface ExportInvoiceResponse {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  exportOrderId: string;
  invoiceType: ExportInvoiceType;
  buyerId: string;
  buyerName?: string;
  currencyCode: string;
  exchangeRate: number;
  subtotalPaise: number;
  totalPaise: number;
  igstPaise: number;
  lutNumber: string | null;
  lutDate: string | null;
  adCode: string | null;
  ieCode: string;
  preCarriageBy: string | null;
  placeOfReceipt: string | null;
  vesselFlightNo: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  finalDestination: string | null;
  terms: string | null;
  items: ExportInvoiceItemResponse[];
  createdAt: string;
  updatedAt: string;
}

// ─── Shipping Document Schemas ────────────────────────────────────

export const ShippingDocumentInputSchema = z.object({
  exportOrderId: z.string().uuid(),
  documentType: z.nativeEnum(ShippingDocumentType),
  documentNumber: z.string().max(100).optional(),
  issuedDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  fileUrl: z.string().url().max(500).optional(),
  notes: z.string().optional(),
});

export type ShippingDocumentInput = z.infer<typeof ShippingDocumentInputSchema>;

export interface ShippingDocumentResponse {
  id: string;
  tenantId: string;
  exportOrderId: string;
  orderNumber?: string;
  documentType: ShippingDocumentType;
  documentNumber: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  status: ShippingDocumentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Customs Duty Schemas ─────────────────────────────────────────

export const CustomsDutyCalculationSchema = z.object({
  exportOrderId: z.string().uuid().optional(),
  importCountry: z.string().length(2),
  hsCode: z.string().min(4).max(10),
  assessableValuePaise: z.number().int().nonnegative(),
});

export type CustomsDutyCalculation = z.infer<typeof CustomsDutyCalculationSchema>;

export interface DutyCalculationResult {
  importCountry: string;
  hsCode: string;
  hsDescription: string;
  dutyRate: number;
  dutyAmountPaise: number;
  cessRate: number | null;
  cessAmountPaise: number | null;
  assessableValuePaise: number;
  totalDutyPaise: number;
  exemptions: Record<string, unknown>[];
}

// ─── Exchange Rate Schemas ────────────────────────────────────────

export const ExchangeRateInputSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  rate: z.number().int().positive(), // rate * 10000
  source: z.nativeEnum(ExchangeRateSource),
  effectiveDate: z.coerce.date(),
});

export type ExchangeRateInput = z.infer<typeof ExchangeRateInputSchema>;

export interface ExchangeRateResponse {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDecimal: number; // rate / 10000 for display
  source: string;
  recordedDate: string;
  effectiveDate: string;
}

// ─── Export Compliance Schemas ────────────────────────────────────

export const ExportComplianceCheckSchema = z.object({
  destinationCountry: z.string().length(2),
  productCategories: z.array(z.string()).min(1),
});

export type ExportComplianceCheck = z.infer<typeof ExportComplianceCheckSchema>;

export interface ExportComplianceResult {
  destinationCountry: string;
  productCategory: string;
  requiresHallmark: boolean;
  requiresCertificate: boolean;
  restrictedItems: Record<string, unknown>[];
  dutyExemptions: Record<string, unknown>[];
  notes: string | null;
}

// ─── DGFT License Schemas ────────────────────────────────────────

export const DgftLicenseInputSchema = z.object({
  licenseNumber: z.string().min(1).max(100),
  licenseType: z.nativeEnum(DgftLicenseType),
  issuedDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  valuePaise: z.number().int().nonnegative(),
  fileUrl: z.string().url().max(500).optional(),
});

export type DgftLicenseInput = z.infer<typeof DgftLicenseInputSchema>;

export interface DgftLicenseResponse {
  id: string;
  tenantId: string;
  licenseNumber: string;
  licenseType: DgftLicenseType;
  issuedDate: string;
  expiryDate: string;
  valuePaise: number;
  usedValuePaise: number;
  balanceValuePaise: number;
  utilizationPercent: number;
  status: DgftLicenseStatus;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── HS Code Schemas ──────────────────────────────────────────────

export const HsCodeSearchSchema = z.object({
  query: z.string().min(1).optional(),
  chapter: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type HsCodeSearch = z.infer<typeof HsCodeSearchSchema>;

export interface HsCodeResponse {
  id: string;
  hsCode: string;
  description: string;
  chapter: string;
  heading: string;
  subheading: string;
  defaultDutyRate: number;
  isActive: boolean;
}

// ─── Dashboard Schema ─────────────────────────────────────────────

export interface ExportDashboardResponse {
  activeOrders: number;
  pendingShipments: number;
  totalExportValuePaise: number;
  totalExportValueCurrency: string;
  topDestinations: Array<{
    country: string;
    orderCount: number;
    totalValuePaise: number;
  }>;
  licenseUtilization: Array<{
    licenseNumber: string;
    licenseType: DgftLicenseType;
    valuePaise: number;
    usedValuePaise: number;
    utilizationPercent: number;
    status: DgftLicenseStatus;
  }>;
  recentOrders: ExportOrderResponse[];
  recentInvoices: ExportInvoiceResponse[];
}

// ─── Document Generation Data ─────────────────────────────────────

export interface PackingListData {
  exportOrderId: string;
  orderNumber: string;
  buyerName: string;
  buyerAddress: string;
  items: Array<{
    description: string;
    quantity: number;
    grossWeightMg: number;
    netWeightMg: number;
    hsCode: string;
  }>;
  totalGrossWeightMg: number;
  totalNetWeightMg: number;
  totalPackages: number;
}

export interface ShippingBillData {
  exporterName: string;
  ieCode: string;
  adCode: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerName: string;
  buyerCountry: string;
  portOfLoading: string;
  portOfDischarge: string;
  items: Array<{
    description: string;
    hsCode: string;
    quantity: number;
    valuePaise: number;
    weightMg: number;
    countryOfOrigin: string;
  }>;
  totalFobValuePaise: number;
  currencyCode: string;
  exchangeRate: number;
}

export interface CertificateOfOriginData {
  exporterName: string;
  exporterAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeCountry: string;
  transportDetails: string;
  portOfLoading: string;
  portOfDischarge: string;
  items: Array<{
    description: string;
    hsCode: string;
    quantity: number;
    weightMg: number;
    countryOfOrigin: string;
  }>;
  invoiceNumber: string;
  invoiceDate: string;
}
