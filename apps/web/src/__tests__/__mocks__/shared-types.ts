// Mock for @caratflow/shared-types - provides enums and type stubs

export enum DeviceStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  INITIALIZING = 'INITIALIZING',
}

export enum DeviceType {
  RFID_READER = 'RFID_READER',
  BARCODE_SCANNER = 'BARCODE_SCANNER',
  WEIGHING_SCALE = 'WEIGHING_SCALE',
  LABEL_PRINTER = 'LABEL_PRINTER',
  CUSTOMER_DISPLAY = 'CUSTOMER_DISPLAY',
  BIOMETRIC = 'BIOMETRIC',
}

export enum ConnectionType {
  USB_HID = 'USB_HID',
  USB_SERIAL = 'USB_SERIAL',
  BLUETOOTH = 'BLUETOOTH',
  NETWORK_TCP = 'NETWORK_TCP',
  NETWORK_HTTP = 'NETWORK_HTTP',
}

export const JEWELRY_LABEL_FIELDS = [
  'productName', 'sku', 'barcode', 'grossWeight', 'netWeight',
  'purity', 'huid', 'price', 'qrCode',
] as const;

// Type stubs for components that use `import type` (these are erased at runtime)
export type ChartData = any;
export type KpiData = any;
export type ForecastResult = any;
export type SupportedEntity = any;
export type CustomReportFilter = any;
export type CustomReportAggregation = any;
export type AggregationType = string;
export type DashboardWidgetConfig = any;
export type RfidTagLookupResponse = any;
export type BarcodeProductLookup = any;
export type WeightReading = any;
export type WeightCaptureResponse = any;
export type PrintPreviewResponse = any;
export type LabelField = any;
export type CreateLabelTemplate = any;
export type CustomerDisplayMessage = any;
export type BiometricEventResponse = any;
export type RfidStockTakeResult = any;
export type RfidTagData = any;
export type CreateDeviceConfig = any;
