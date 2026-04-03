// ─── CaratFlow Hardware Integration Types ──────────────────────
// Types for device management, RFID, barcode, weighing scale,
// label printing, customer display, and biometric integrations.

import { z } from 'zod';
import { UuidSchema, PaginationSchema } from './common';

// ─── Enums ────────────────────────────────────────────────────

export enum DeviceType {
  RFID_READER = 'RFID_READER',
  BARCODE_SCANNER = 'BARCODE_SCANNER',
  WEIGHING_SCALE = 'WEIGHING_SCALE',
  LABEL_PRINTER = 'LABEL_PRINTER',
  CUSTOMER_DISPLAY = 'CUSTOMER_DISPLAY',
  BIOMETRIC = 'BIOMETRIC',
}

export enum DeviceStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  INITIALIZING = 'INITIALIZING',
}

export enum ConnectionType {
  USB_HID = 'USB_HID',
  USB_SERIAL = 'USB_SERIAL',
  BLUETOOTH = 'BLUETOOTH',
  NETWORK_TCP = 'NETWORK_TCP',
  NETWORK_HTTP = 'NETWORK_HTTP',
}

// ─── Zod Enum Schemas ─────────────────────────────────────────

export const DeviceTypeSchema = z.nativeEnum(DeviceType);
export const DeviceStatusSchema = z.nativeEnum(DeviceStatus);
export const ConnectionTypeSchema = z.nativeEnum(ConnectionType);

// ─── Device Config ────────────────────────────────────────────

export const DeviceConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  deviceType: DeviceTypeSchema,
  connectionType: ConnectionTypeSchema,
  port: z.string().max(100).optional(),
  baudRate: z.number().int().positive().optional(),
  ipAddress: z.string().max(100).optional(),
  tcpPort: z.number().int().min(1).max(65535).optional(),
  vendorId: z.string().max(20).optional(),
  productId: z.string().max(20).optional(),
  settings: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
  locationId: UuidSchema,
});
export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;

export const CreateDeviceConfigSchema = DeviceConfigSchema.omit({ id: true });
export type CreateDeviceConfig = z.infer<typeof CreateDeviceConfigSchema>;

export const UpdateDeviceConfigSchema = DeviceConfigSchema.partial().omit({ id: true });
export type UpdateDeviceConfig = z.infer<typeof UpdateDeviceConfigSchema>;

export const DeviceConfigResponseSchema = DeviceConfigSchema.extend({
  tenantId: UuidSchema,
  status: DeviceStatusSchema.optional(),
  lastSeenAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type DeviceConfigResponse = z.infer<typeof DeviceConfigResponseSchema>;

export const DeviceListInputSchema = PaginationSchema.extend({
  locationId: UuidSchema.optional(),
  deviceType: DeviceTypeSchema.optional(),
  isActive: z.boolean().optional(),
});
export type DeviceListInput = z.infer<typeof DeviceListInputSchema>;

// ─── RFID ─────────────────────────────────────────────────────

export const RfidTagDataSchema = z.object({
  tagId: z.string().min(1),
  epc: z.string().min(1),
  rssi: z.number().optional(),
  timestamp: z.string(),
});
export type RfidTagData = z.infer<typeof RfidTagDataSchema>;

export const RfidScanResultSchema = z.object({
  tags: z.array(RfidTagDataSchema),
  readerDeviceId: UuidSchema,
});
export type RfidScanResult = z.infer<typeof RfidScanResultSchema>;

export const RfidWriteRequestSchema = z.object({
  tagId: z.string().min(1),
  data: z.string().min(1),
});
export type RfidWriteRequest = z.infer<typeof RfidWriteRequestSchema>;

export const RfidTagLookupResponseSchema = z.object({
  tagId: z.string(),
  epc: z.string(),
  serialNumber: z.string().nullable(),
  productId: z.string().nullable(),
  productName: z.string().nullable(),
  productSku: z.string().nullable(),
  locationId: z.string().nullable(),
  status: z.string().nullable(),
});
export type RfidTagLookupResponse = z.infer<typeof RfidTagLookupResponseSchema>;

export const RfidStockTakeInputSchema = z.object({
  locationId: UuidSchema,
  scannedTags: z.array(RfidTagDataSchema),
});
export type RfidStockTakeInput = z.infer<typeof RfidStockTakeInputSchema>;

export const RfidStockTakeResultSchema = z.object({
  locationId: z.string(),
  totalScanned: z.number().int(),
  matched: z.array(z.object({
    tagId: z.string(),
    epc: z.string(),
    serialNumber: z.string(),
    productId: z.string(),
    productName: z.string(),
    productSku: z.string(),
  })),
  unmatched: z.array(z.object({
    tagId: z.string(),
    epc: z.string(),
  })),
  missing: z.array(z.object({
    serialNumber: z.string(),
    productId: z.string(),
    productName: z.string(),
    productSku: z.string(),
    rfidTag: z.string(),
  })),
  timestamp: z.string(),
});
export type RfidStockTakeResult = z.infer<typeof RfidStockTakeResultSchema>;

export const RfidAntiTheftCheckSchema = z.object({
  tagId: z.string().min(1),
  epc: z.string().min(1),
  locationId: UuidSchema,
});
export type RfidAntiTheftCheck = z.infer<typeof RfidAntiTheftCheckSchema>;

export const RfidAntiTheftResultSchema = z.object({
  tagId: z.string(),
  isAuthorized: z.boolean(),
  serialNumber: z.string().nullable(),
  productName: z.string().nullable(),
  reason: z.string(),
});
export type RfidAntiTheftResult = z.infer<typeof RfidAntiTheftResultSchema>;

// ─── Barcode ──────────────────────────────────────────────────

export const BarcodeScanResultSchema = z.object({
  barcode: z.string().min(1),
  format: z.string().default('CODE128'),
  deviceId: UuidSchema,
  timestamp: z.string(),
});
export type BarcodeScanResult = z.infer<typeof BarcodeScanResultSchema>;

export const ProductSummarySchema = z.object({
  id: UuidSchema,
  sku: z.string(),
  name: z.string(),
  productType: z.string().nullable(),
  sellingPricePaise: z.number().int().nullable(),
  grossWeightMg: z.number().int().nullable(),
  netWeightMg: z.number().int().nullable(),
  purityFineness: z.number().int().nullable(),
  huid: z.string().nullable(),
});
export type ProductSummary = z.infer<typeof ProductSummarySchema>;

export const BarcodeProductLookupSchema = z.object({
  barcode: z.string(),
  product: ProductSummarySchema.nullable(),
  serialNumber: z.string().nullable(),
});
export type BarcodeProductLookup = z.infer<typeof BarcodeProductLookupSchema>;

export const BarcodeGenerateRequestSchema = z.object({
  productId: UuidSchema,
  format: z.enum(['SKU', 'SERIAL', 'CUSTOM']).default('SKU'),
  customPrefix: z.string().max(20).optional(),
});
export type BarcodeGenerateRequest = z.infer<typeof BarcodeGenerateRequestSchema>;

export const BarcodeGenerateResponseSchema = z.object({
  productId: z.string(),
  barcode: z.string(),
  format: z.string(),
  qrData: z.string().optional(),
});
export type BarcodeGenerateResponse = z.infer<typeof BarcodeGenerateResponseSchema>;

export const BarcodeBulkGenerateRequestSchema = z.object({
  productIds: z.array(UuidSchema).min(1).max(500),
  format: z.enum(['SKU', 'SERIAL', 'CUSTOM']).default('SKU'),
  customPrefix: z.string().max(20).optional(),
});
export type BarcodeBulkGenerateRequest = z.infer<typeof BarcodeBulkGenerateRequestSchema>;

// ─── Weighing Scale ───────────────────────────────────────────

export const WeightReadingSchema = z.object({
  weightGrams: z.number().nonnegative(),
  weightMg: z.number().int().nonnegative(),
  unit: z.string().default('g'),
  isStable: z.boolean(),
  deviceId: UuidSchema,
  timestamp: z.string(),
});
export type WeightReading = z.infer<typeof WeightReadingSchema>;

export const WeightCaptureRequestSchema = z.object({
  deviceId: UuidSchema,
  tareWeightMg: z.number().int().nonnegative().default(0),
});
export type WeightCaptureRequest = z.infer<typeof WeightCaptureRequestSchema>;

export const WeightCaptureResponseSchema = z.object({
  grossWeightMg: z.number().int(),
  tareWeightMg: z.number().int(),
  netWeightMg: z.number().int(),
  isStable: z.boolean(),
  capturedAt: z.string(),
});
export type WeightCaptureResponse = z.infer<typeof WeightCaptureResponseSchema>;

export const WeightPricingRequestSchema = z.object({
  weightMg: z.number().int().positive(),
  metalRatePaisePerGram: z.number().int().positive(),
  purityFineness: z.number().int().min(1).max(999),
});
export type WeightPricingRequest = z.infer<typeof WeightPricingRequestSchema>;

export const WeightPricingResponseSchema = z.object({
  weightMg: z.number().int(),
  weightGrams: z.number(),
  purityFineness: z.number().int(),
  pureWeightMg: z.number().int(),
  metalRatePaisePerGram: z.number().int(),
  metalValuePaise: z.number().int(),
});
export type WeightPricingResponse = z.infer<typeof WeightPricingResponseSchema>;

export const WeightToleranceCheckSchema = z.object({
  scaleWeightMg: z.number().int().positive(),
  storedWeightMg: z.number().int().positive(),
  tolerancePercent: z.number().min(0).max(100).default(1),
});
export type WeightToleranceCheck = z.infer<typeof WeightToleranceCheckSchema>;

export const WeightToleranceResultSchema = z.object({
  scaleWeightMg: z.number().int(),
  storedWeightMg: z.number().int(),
  differenceMg: z.number().int(),
  differencePercent: z.number(),
  withinTolerance: z.boolean(),
  tolerancePercent: z.number(),
});
export type WeightToleranceResult = z.infer<typeof WeightToleranceResultSchema>;

// ─── Label Printer ────────────────────────────────────────────

export const LabelFieldSchema = z.object({
  type: z.enum(['text', 'barcode', 'qr', 'image']),
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
  value: z.string(),
  fontSize: z.number().int().positive().optional(),
  barcodeType: z.string().optional(),
});
export type LabelField = z.infer<typeof LabelFieldSchema>;

export const LabelTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  width: z.number().positive(),
  height: z.number().positive(),
  fields: z.array(LabelFieldSchema),
});
export type LabelTemplate = z.infer<typeof LabelTemplateSchema>;

export const CreateLabelTemplateSchema = LabelTemplateSchema.omit({ id: true });
export type CreateLabelTemplate = z.infer<typeof CreateLabelTemplateSchema>;

export const UpdateLabelTemplateSchema = LabelTemplateSchema.partial().omit({ id: true });
export type UpdateLabelTemplate = z.infer<typeof UpdateLabelTemplateSchema>;

export const LabelTemplateResponseSchema = LabelTemplateSchema.extend({
  tenantId: UuidSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type LabelTemplateResponse = z.infer<typeof LabelTemplateResponseSchema>;

export const PrintLabelRequestSchema = z.object({
  templateId: UuidSchema,
  data: z.record(z.string()),
  copies: z.number().int().min(1).max(100).default(1),
  printerId: UuidSchema,
});
export type PrintLabelRequest = z.infer<typeof PrintLabelRequestSchema>;

export const PrintBulkLabelRequestSchema = z.object({
  templateId: UuidSchema,
  items: z.array(z.object({
    data: z.record(z.string()),
    copies: z.number().int().min(1).max(100).default(1),
  })).min(1).max(500),
  printerId: UuidSchema,
});
export type PrintBulkLabelRequest = z.infer<typeof PrintBulkLabelRequestSchema>;

export const PrintPreviewResponseSchema = z.object({
  templateId: z.string(),
  templateName: z.string(),
  width: z.number(),
  height: z.number(),
  renderedFields: z.array(LabelFieldSchema.extend({
    resolvedValue: z.string(),
  })),
});
export type PrintPreviewResponse = z.infer<typeof PrintPreviewResponseSchema>;

// Standard jewelry label field keys
export const JEWELRY_LABEL_FIELDS = [
  'sku',
  'productName',
  'grossWeight',
  'netWeight',
  'purity',
  'huid',
  'price',
  'barcode',
  'qrCode',
] as const;
export type JewelryLabelField = (typeof JEWELRY_LABEL_FIELDS)[number];

// ─── Customer Display ─────────────────────────────────────────

export const CustomerDisplayMessageSchema = z.object({
  line1: z.string().max(40),
  line2: z.string().max(40).optional(),
  amount: z.number().int().nonnegative().optional(),
  deviceId: UuidSchema,
});
export type CustomerDisplayMessage = z.infer<typeof CustomerDisplayMessageSchema>;

// ─── Biometric ────────────────────────────────────────────────

export const BiometricEventSchema = z.object({
  employeeCode: z.string().min(1),
  eventType: z.enum(['CHECK_IN', 'CHECK_OUT']),
  timestamp: z.string(),
  deviceId: UuidSchema,
});
export type BiometricEvent = z.infer<typeof BiometricEventSchema>;

export const BiometricEventResponseSchema = BiometricEventSchema.extend({
  id: z.string(),
  tenantId: UuidSchema,
  employeeName: z.string().nullable(),
  processed: z.boolean(),
});
export type BiometricEventResponse = z.infer<typeof BiometricEventResponseSchema>;

export const BiometricAttendanceQuerySchema = z.object({
  deviceId: UuidSchema.optional(),
  date: z.string().optional(),
  employeeCode: z.string().optional(),
});
export type BiometricAttendanceQuery = z.infer<typeof BiometricAttendanceQuerySchema>;

// ─── WebSocket Event Types ────────────────────────────────────

export const HardwareWebSocketEvents = {
  DEVICE_CONNECTED: 'device:connected',
  DEVICE_DISCONNECTED: 'device:disconnected',
  RFID_SCAN: 'rfid:scan',
  BARCODE_SCAN: 'barcode:scan',
  SCALE_READING: 'scale:reading',
  BIOMETRIC_EVENT: 'biometric:event',
  DISPLAY_UPDATE: 'display:update',
} as const;

export type HardwareWebSocketEvent = (typeof HardwareWebSocketEvents)[keyof typeof HardwareWebSocketEvents];
