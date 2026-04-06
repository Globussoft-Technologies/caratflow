import { describe, it, expect } from 'vitest';
import {
  DeviceType,
  DeviceStatus,
  ConnectionType,
  DeviceTypeSchema,
  DeviceStatusSchema,
  ConnectionTypeSchema,
  DeviceConfigSchema,
  CreateDeviceConfigSchema,
  UpdateDeviceConfigSchema,
  DeviceConfigResponseSchema,
  DeviceListInputSchema,
  RfidTagDataSchema,
  RfidScanResultSchema,
  RfidWriteRequestSchema,
  RfidTagLookupResponseSchema,
  RfidStockTakeInputSchema,
  RfidStockTakeResultSchema,
  RfidAntiTheftCheckSchema,
  RfidAntiTheftResultSchema,
  BarcodeScanResultSchema,
  ProductSummarySchema,
  BarcodeProductLookupSchema,
  BarcodeGenerateRequestSchema,
  BarcodeGenerateResponseSchema,
  BarcodeBulkGenerateRequestSchema,
  WeightReadingSchema,
  WeightCaptureRequestSchema,
  WeightCaptureResponseSchema,
  WeightPricingRequestSchema,
  WeightPricingResponseSchema,
  WeightToleranceCheckSchema,
  WeightToleranceResultSchema,
  LabelFieldSchema,
  LabelTemplateSchema,
  CreateLabelTemplateSchema,
  UpdateLabelTemplateSchema,
  LabelTemplateResponseSchema,
  PrintLabelRequestSchema,
  PrintBulkLabelRequestSchema,
  PrintPreviewResponseSchema,
  CustomerDisplayMessageSchema,
  BiometricEventSchema,
  BiometricEventResponseSchema,
  BiometricAttendanceQuerySchema,
  HardwareWebSocketEvents,
  JEWELRY_LABEL_FIELDS,
} from '../hardware';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '660e8400-e29b-41d4-a716-446655440001';
const NOW = '2026-04-07T10:00:00Z';

// ─── Enum Schemas ────────────────────────────────────────────

describe('DeviceTypeSchema', () => {
  it('should accept valid device types', () => {
    for (const val of Object.values(DeviceType)) {
      expect(DeviceTypeSchema.safeParse(val).success).toBe(true);
    }
  });

  it('should reject invalid device type', () => {
    expect(DeviceTypeSchema.safeParse('INVALID').success).toBe(false);
  });
});

describe('DeviceStatusSchema', () => {
  it('should accept valid statuses', () => {
    for (const val of Object.values(DeviceStatus)) {
      expect(DeviceStatusSchema.safeParse(val).success).toBe(true);
    }
  });

  it('should reject invalid status', () => {
    expect(DeviceStatusSchema.safeParse('UNKNOWN').success).toBe(false);
  });
});

describe('ConnectionTypeSchema', () => {
  it('should accept valid connection types', () => {
    for (const val of Object.values(ConnectionType)) {
      expect(ConnectionTypeSchema.safeParse(val).success).toBe(true);
    }
  });

  it('should reject invalid connection type', () => {
    expect(ConnectionTypeSchema.safeParse('WIFI').success).toBe(false);
  });
});

// ─── DeviceConfig Schemas ────────────────────────────────────

describe('DeviceConfigSchema', () => {
  const validConfig = {
    id: UUID,
    name: 'RFID Reader 1',
    deviceType: DeviceType.RFID_READER,
    connectionType: ConnectionType.USB_HID,
    locationId: UUID2,
  };

  it('should parse valid config with required fields', () => {
    const result = DeviceConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      expect(result.data.settings).toEqual({});
    }
  });

  it('should parse config with all optional fields', () => {
    const result = DeviceConfigSchema.safeParse({
      ...validConfig,
      port: 'COM3',
      baudRate: 9600,
      ipAddress: '192.168.1.100',
      tcpPort: 8080,
      vendorId: '0x1234',
      productId: '0x5678',
      settings: { key: 'val' },
      isActive: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.port).toBe('COM3');
      expect(result.data.baudRate).toBe(9600);
      expect(result.data.isActive).toBe(false);
    }
  });

  it('should reject missing name', () => {
    const { name, ...rest } = validConfig;
    expect(DeviceConfigSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject invalid UUID for id', () => {
    expect(DeviceConfigSchema.safeParse({ ...validConfig, id: 'not-uuid' }).success).toBe(false);
  });

  it('should reject tcpPort out of range', () => {
    expect(DeviceConfigSchema.safeParse({ ...validConfig, tcpPort: 70000 }).success).toBe(false);
    expect(DeviceConfigSchema.safeParse({ ...validConfig, tcpPort: 0 }).success).toBe(false);
  });
});

describe('CreateDeviceConfigSchema', () => {
  it('should parse without id field', () => {
    const result = CreateDeviceConfigSchema.safeParse({
      name: 'Scale',
      deviceType: DeviceType.WEIGHING_SCALE,
      connectionType: ConnectionType.USB_SERIAL,
      locationId: UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateDeviceConfigSchema', () => {
  it('should allow partial updates', () => {
    const result = UpdateDeviceConfigSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('should accept empty object (all optional)', () => {
    expect(UpdateDeviceConfigSchema.safeParse({}).success).toBe(true);
  });
});

describe('DeviceConfigResponseSchema', () => {
  it('should parse response with timestamps', () => {
    const result = DeviceConfigResponseSchema.safeParse({
      id: UUID,
      name: 'Reader',
      deviceType: DeviceType.RFID_READER,
      connectionType: ConnectionType.NETWORK_TCP,
      locationId: UUID2,
      tenantId: UUID,
      status: DeviceStatus.CONNECTED,
      lastSeenAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

describe('DeviceListInputSchema', () => {
  it('should parse with defaults', () => {
    const result = DeviceListInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should accept optional filters', () => {
    const result = DeviceListInputSchema.safeParse({
      locationId: UUID,
      deviceType: DeviceType.BARCODE_SCANNER,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });
});

// ─── RFID Schemas ────────────────────────────────────────────

describe('RfidTagDataSchema', () => {
  const validTag = { tagId: 'TAG001', epc: 'E200001234', timestamp: NOW };

  it('should parse valid tag data', () => {
    expect(RfidTagDataSchema.safeParse(validTag).success).toBe(true);
  });

  it('should accept optional rssi', () => {
    const result = RfidTagDataSchema.safeParse({ ...validTag, rssi: -45 });
    expect(result.success).toBe(true);
  });

  it('should reject empty tagId', () => {
    expect(RfidTagDataSchema.safeParse({ ...validTag, tagId: '' }).success).toBe(false);
  });
});

describe('RfidScanResultSchema', () => {
  it('should parse scan result with tags', () => {
    const result = RfidScanResultSchema.safeParse({
      tags: [{ tagId: 'T1', epc: 'E1', timestamp: NOW }],
      readerDeviceId: UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe('RfidWriteRequestSchema', () => {
  it('should parse valid write request', () => {
    expect(RfidWriteRequestSchema.safeParse({ tagId: 'T1', data: 'DEADBEEF' }).success).toBe(true);
  });

  it('should reject empty data', () => {
    expect(RfidWriteRequestSchema.safeParse({ tagId: 'T1', data: '' }).success).toBe(false);
  });
});

describe('RfidTagLookupResponseSchema', () => {
  it('should parse with nullable fields', () => {
    const result = RfidTagLookupResponseSchema.safeParse({
      tagId: 'T1',
      epc: 'E1',
      serialNumber: null,
      productId: null,
      productName: null,
      productSku: null,
      locationId: null,
      status: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('RfidStockTakeInputSchema', () => {
  it('should parse valid stock take input', () => {
    const result = RfidStockTakeInputSchema.safeParse({
      locationId: UUID,
      scannedTags: [{ tagId: 'T1', epc: 'E1', timestamp: NOW }],
    });
    expect(result.success).toBe(true);
  });
});

describe('RfidStockTakeResultSchema', () => {
  it('should parse full stock take result', () => {
    const result = RfidStockTakeResultSchema.safeParse({
      locationId: UUID,
      totalScanned: 2,
      matched: [{ tagId: 'T1', epc: 'E1', serialNumber: 'S1', productId: 'P1', productName: 'Ring', productSku: 'SKU1' }],
      unmatched: [{ tagId: 'T2', epc: 'E2' }],
      missing: [{ serialNumber: 'S2', productId: 'P2', productName: 'Bangle', productSku: 'SKU2', rfidTag: 'T3' }],
      timestamp: NOW,
    });
    expect(result.success).toBe(true);
  });
});

describe('RfidAntiTheftCheckSchema', () => {
  it('should parse valid check', () => {
    expect(RfidAntiTheftCheckSchema.safeParse({ tagId: 'T1', epc: 'E1', locationId: UUID }).success).toBe(true);
  });

  it('should reject empty tagId', () => {
    expect(RfidAntiTheftCheckSchema.safeParse({ tagId: '', epc: 'E1', locationId: UUID }).success).toBe(false);
  });
});

describe('RfidAntiTheftResultSchema', () => {
  it('should parse result with nullable fields', () => {
    const result = RfidAntiTheftResultSchema.safeParse({
      tagId: 'T1',
      isAuthorized: false,
      serialNumber: null,
      productName: null,
      reason: 'Not found in system',
    });
    expect(result.success).toBe(true);
  });
});

// ─── Barcode Schemas ─────────────────────────────────────────

describe('BarcodeScanResultSchema', () => {
  it('should parse with default format', () => {
    const result = BarcodeScanResultSchema.safeParse({
      barcode: '1234567890',
      deviceId: UUID,
      timestamp: NOW,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe('CODE128');
    }
  });
});

describe('ProductSummarySchema', () => {
  it('should parse with nullable fields', () => {
    const result = ProductSummarySchema.safeParse({
      id: UUID,
      sku: 'SKU001',
      name: 'Gold Ring',
      productType: null,
      sellingPricePaise: null,
      grossWeightMg: 5000,
      netWeightMg: 4500,
      purityFineness: 916,
      huid: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('BarcodeProductLookupSchema', () => {
  it('should parse with null product', () => {
    const result = BarcodeProductLookupSchema.safeParse({
      barcode: 'BC001',
      product: null,
      serialNumber: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('BarcodeGenerateRequestSchema', () => {
  it('should parse with default format', () => {
    const result = BarcodeGenerateRequestSchema.safeParse({ productId: UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe('SKU');
    }
  });

  it('should accept SERIAL and CUSTOM formats', () => {
    expect(BarcodeGenerateRequestSchema.safeParse({ productId: UUID, format: 'SERIAL' }).success).toBe(true);
    expect(BarcodeGenerateRequestSchema.safeParse({ productId: UUID, format: 'CUSTOM', customPrefix: 'CF' }).success).toBe(true);
  });

  it('should reject invalid format', () => {
    expect(BarcodeGenerateRequestSchema.safeParse({ productId: UUID, format: 'INVALID' }).success).toBe(false);
  });
});

describe('BarcodeGenerateResponseSchema', () => {
  it('should parse response with optional qrData', () => {
    const result = BarcodeGenerateResponseSchema.safeParse({
      productId: UUID,
      barcode: 'BC123',
      format: 'SKU',
    });
    expect(result.success).toBe(true);
  });
});

describe('BarcodeBulkGenerateRequestSchema', () => {
  it('should parse valid bulk request', () => {
    const result = BarcodeBulkGenerateRequestSchema.safeParse({
      productIds: [UUID, UUID2],
      format: 'SKU',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty productIds array', () => {
    expect(BarcodeBulkGenerateRequestSchema.safeParse({ productIds: [] }).success).toBe(false);
  });
});

// ─── Weighing Scale Schemas ──────────────────────────────────

describe('WeightReadingSchema', () => {
  it('should parse valid weight reading', () => {
    const result = WeightReadingSchema.safeParse({
      weightGrams: 5.0,
      weightMg: 5000,
      isStable: true,
      deviceId: UUID,
      timestamp: NOW,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe('g');
    }
  });

  it('should reject negative weight', () => {
    expect(WeightReadingSchema.safeParse({
      weightGrams: -1,
      weightMg: 5000,
      isStable: true,
      deviceId: UUID,
      timestamp: NOW,
    }).success).toBe(false);
  });
});

describe('WeightCaptureRequestSchema', () => {
  it('should parse with default tare weight', () => {
    const result = WeightCaptureRequestSchema.safeParse({ deviceId: UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tareWeightMg).toBe(0);
    }
  });
});

describe('WeightCaptureResponseSchema', () => {
  it('should parse valid response', () => {
    const result = WeightCaptureResponseSchema.safeParse({
      grossWeightMg: 5000,
      tareWeightMg: 200,
      netWeightMg: 4800,
      isStable: true,
      capturedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

describe('WeightPricingRequestSchema', () => {
  it('should parse valid pricing request', () => {
    const result = WeightPricingRequestSchema.safeParse({
      weightMg: 5000,
      metalRatePaisePerGram: 550000,
      purityFineness: 916,
    });
    expect(result.success).toBe(true);
  });

  it('should reject purity above 999', () => {
    expect(WeightPricingRequestSchema.safeParse({
      weightMg: 5000,
      metalRatePaisePerGram: 550000,
      purityFineness: 1000,
    }).success).toBe(false);
  });
});

describe('WeightPricingResponseSchema', () => {
  it('should parse valid pricing response', () => {
    const result = WeightPricingResponseSchema.safeParse({
      weightMg: 5000,
      weightGrams: 5.0,
      purityFineness: 916,
      pureWeightMg: 4580,
      metalRatePaisePerGram: 550000,
      metalValuePaise: 2519000,
    });
    expect(result.success).toBe(true);
  });
});

describe('WeightToleranceCheckSchema', () => {
  it('should parse with default tolerance', () => {
    const result = WeightToleranceCheckSchema.safeParse({
      scaleWeightMg: 5000,
      storedWeightMg: 5010,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tolerancePercent).toBe(1);
    }
  });

  it('should reject tolerance > 100', () => {
    expect(WeightToleranceCheckSchema.safeParse({
      scaleWeightMg: 5000,
      storedWeightMg: 5010,
      tolerancePercent: 101,
    }).success).toBe(false);
  });
});

describe('WeightToleranceResultSchema', () => {
  it('should parse valid result', () => {
    const result = WeightToleranceResultSchema.safeParse({
      scaleWeightMg: 5000,
      storedWeightMg: 5010,
      differenceMg: 10,
      differencePercent: 0.2,
      withinTolerance: true,
      tolerancePercent: 1,
    });
    expect(result.success).toBe(true);
  });
});

// ─── Label Printer Schemas ───────────────────────────────────

describe('LabelFieldSchema', () => {
  it('should parse valid label field', () => {
    const result = LabelFieldSchema.safeParse({
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      value: 'SKU: CF-001',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all field types', () => {
    for (const type of ['text', 'barcode', 'qr', 'image'] as const) {
      expect(LabelFieldSchema.safeParse({
        type,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        value: 'test',
      }).success).toBe(true);
    }
  });

  it('should reject invalid field type', () => {
    expect(LabelFieldSchema.safeParse({
      type: 'video',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      value: 'test',
    }).success).toBe(false);
  });

  it('should reject non-positive width', () => {
    expect(LabelFieldSchema.safeParse({
      type: 'text',
      x: 0,
      y: 0,
      width: 0,
      height: 10,
      value: 'test',
    }).success).toBe(false);
  });
});

describe('LabelTemplateSchema', () => {
  const validTemplate = {
    id: UUID,
    name: 'Jewelry Tag',
    width: 50,
    height: 25,
    fields: [{ type: 'text' as const, x: 0, y: 0, width: 40, height: 10, value: '{{sku}}' }],
  };

  it('should parse valid template', () => {
    expect(LabelTemplateSchema.safeParse(validTemplate).success).toBe(true);
  });

  it('should reject empty name', () => {
    expect(LabelTemplateSchema.safeParse({ ...validTemplate, name: '' }).success).toBe(false);
  });
});

describe('CreateLabelTemplateSchema', () => {
  it('should parse without id', () => {
    const result = CreateLabelTemplateSchema.safeParse({
      name: 'New Template',
      width: 50,
      height: 25,
      fields: [],
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateLabelTemplateSchema', () => {
  it('should allow partial updates', () => {
    expect(UpdateLabelTemplateSchema.safeParse({ name: 'Updated' }).success).toBe(true);
    expect(UpdateLabelTemplateSchema.safeParse({}).success).toBe(true);
  });
});

describe('LabelTemplateResponseSchema', () => {
  it('should parse with tenant and timestamps', () => {
    const result = LabelTemplateResponseSchema.safeParse({
      id: UUID,
      name: 'Template',
      width: 50,
      height: 25,
      fields: [],
      tenantId: UUID,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

describe('PrintLabelRequestSchema', () => {
  it('should parse with default copies', () => {
    const result = PrintLabelRequestSchema.safeParse({
      templateId: UUID,
      data: { sku: 'CF-001' },
      printerId: UUID2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.copies).toBe(1);
    }
  });

  it('should reject copies > 100', () => {
    expect(PrintLabelRequestSchema.safeParse({
      templateId: UUID,
      data: { sku: 'CF-001' },
      copies: 101,
      printerId: UUID2,
    }).success).toBe(false);
  });
});

describe('PrintBulkLabelRequestSchema', () => {
  it('should parse valid bulk request', () => {
    const result = PrintBulkLabelRequestSchema.safeParse({
      templateId: UUID,
      items: [{ data: { sku: 'CF-001' } }],
      printerId: UUID2,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    expect(PrintBulkLabelRequestSchema.safeParse({
      templateId: UUID,
      items: [],
      printerId: UUID2,
    }).success).toBe(false);
  });
});

describe('PrintPreviewResponseSchema', () => {
  it('should parse response with rendered fields', () => {
    const result = PrintPreviewResponseSchema.safeParse({
      templateId: UUID,
      templateName: 'Tag',
      width: 50,
      height: 25,
      renderedFields: [{
        type: 'text',
        x: 0,
        y: 0,
        width: 40,
        height: 10,
        value: '{{sku}}',
        resolvedValue: 'CF-001',
      }],
    });
    expect(result.success).toBe(true);
  });
});

// ─── Customer Display Schema ─────────────────────────────────

describe('CustomerDisplayMessageSchema', () => {
  it('should parse with required fields', () => {
    const result = CustomerDisplayMessageSchema.safeParse({
      line1: 'Welcome!',
      deviceId: UUID,
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional line2 and amount', () => {
    const result = CustomerDisplayMessageSchema.safeParse({
      line1: 'Total',
      line2: 'Rs. 50,000',
      amount: 5000000,
      deviceId: UUID,
    });
    expect(result.success).toBe(true);
  });

  it('should reject line1 exceeding 40 chars', () => {
    expect(CustomerDisplayMessageSchema.safeParse({
      line1: 'A'.repeat(41),
      deviceId: UUID,
    }).success).toBe(false);
  });
});

// ─── Biometric Schemas ───────────────────────────────────────

describe('BiometricEventSchema', () => {
  const validEvent = {
    employeeCode: 'EMP001',
    eventType: 'CHECK_IN' as const,
    timestamp: NOW,
    deviceId: UUID,
  };

  it('should parse valid biometric event', () => {
    expect(BiometricEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it('should accept CHECK_OUT event type', () => {
    expect(BiometricEventSchema.safeParse({ ...validEvent, eventType: 'CHECK_OUT' }).success).toBe(true);
  });

  it('should reject invalid event type', () => {
    expect(BiometricEventSchema.safeParse({ ...validEvent, eventType: 'LUNCH' }).success).toBe(false);
  });

  it('should reject empty employee code', () => {
    expect(BiometricEventSchema.safeParse({ ...validEvent, employeeCode: '' }).success).toBe(false);
  });
});

describe('BiometricEventResponseSchema', () => {
  it('should parse response with extended fields', () => {
    const result = BiometricEventResponseSchema.safeParse({
      id: UUID,
      tenantId: UUID2,
      employeeCode: 'EMP001',
      eventType: 'CHECK_IN',
      timestamp: NOW,
      deviceId: UUID,
      employeeName: 'Rahul Sharma',
      processed: true,
    });
    expect(result.success).toBe(true);
  });
});

describe('BiometricAttendanceQuerySchema', () => {
  it('should accept empty query (all optional)', () => {
    expect(BiometricAttendanceQuerySchema.safeParse({}).success).toBe(true);
  });

  it('should accept all optional fields', () => {
    const result = BiometricAttendanceQuerySchema.safeParse({
      deviceId: UUID,
      date: '2026-04-07',
      employeeCode: 'EMP001',
    });
    expect(result.success).toBe(true);
  });
});

// ─── Constants ───────────────────────────────────────────────

describe('HardwareWebSocketEvents', () => {
  it('should have correct event strings', () => {
    expect(HardwareWebSocketEvents.DEVICE_CONNECTED).toBe('device:connected');
    expect(HardwareWebSocketEvents.DEVICE_DISCONNECTED).toBe('device:disconnected');
    expect(HardwareWebSocketEvents.RFID_SCAN).toBe('rfid:scan');
    expect(HardwareWebSocketEvents.BARCODE_SCAN).toBe('barcode:scan');
    expect(HardwareWebSocketEvents.SCALE_READING).toBe('scale:reading');
    expect(HardwareWebSocketEvents.BIOMETRIC_EVENT).toBe('biometric:event');
    expect(HardwareWebSocketEvents.DISPLAY_UPDATE).toBe('display:update');
  });
});

describe('JEWELRY_LABEL_FIELDS', () => {
  it('should contain expected field keys', () => {
    expect(JEWELRY_LABEL_FIELDS).toContain('sku');
    expect(JEWELRY_LABEL_FIELDS).toContain('huid');
    expect(JEWELRY_LABEL_FIELDS).toContain('grossWeight');
    expect(JEWELRY_LABEL_FIELDS).toContain('purity');
    expect(JEWELRY_LABEL_FIELDS).toContain('barcode');
    expect(JEWELRY_LABEL_FIELDS.length).toBe(9);
  });
});
