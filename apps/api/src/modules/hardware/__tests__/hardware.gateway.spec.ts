import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @nestjs/websockets before importing the gateway
vi.mock('@nestjs/websockets', () => ({
  WebSocketGateway: () => (target: any) => target,
  WebSocketServer: () => () => {},
  SubscribeMessage: () => () => {},
  OnGatewayInit: undefined,
  OnGatewayConnection: undefined,
  OnGatewayDisconnect: undefined,
  MessageBody: () => () => {},
  ConnectedSocket: () => () => {},
}));

vi.mock('@caratflow/shared-types', () => ({
  HardwareWebSocketEvents: {
    RFID_SCAN: 'hardware:rfid:scan',
    BARCODE_SCAN: 'hardware:barcode:scan',
    SCALE_READING: 'hardware:scale:reading',
    BIOMETRIC_EVENT: 'hardware:biometric:event',
    DEVICE_CONNECTED: 'hardware:device:connected',
    DEVICE_DISCONNECTED: 'hardware:device:disconnected',
    DISPLAY_UPDATE: 'hardware:display:update',
  },
}));

import { HardwareGateway } from '../hardware.gateway';

describe('HardwareGateway', () => {
  let gateway: HardwareGateway;
  let mockRfidService: Record<string, ReturnType<typeof vi.fn>>;
  let mockBarcodeService: Record<string, ReturnType<typeof vi.fn>>;
  let mockScaleService: Record<string, ReturnType<typeof vi.fn>>;
  let mockBiometricService: Record<string, ReturnType<typeof vi.fn>>;
  let mockDisplayService: Record<string, ReturnType<typeof vi.fn>>;
  let mockDeviceService: Record<string, ReturnType<typeof vi.fn>>;
  let mockServer: {
    to: ReturnType<typeof vi.fn>;
  };
  let mockEmit: ReturnType<typeof vi.fn>;

  function createMockClient(overrides: Record<string, unknown> = {}) {
    return {
      handshake: {
        auth: {
          tenantId: 'tenant-1',
          locationId: 'loc-1',
          ...overrides,
        },
      },
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
    } as any;
  }

  beforeEach(() => {
    mockEmit = vi.fn();
    mockServer = {
      to: vi.fn().mockReturnValue({ emit: mockEmit }),
    };

    mockRfidService = {
      processScans: vi.fn().mockResolvedValue([{ tagId: 'tag-1', product: { id: 'prod-1' } }]),
    };
    mockBarcodeService = {
      lookup: vi.fn().mockResolvedValue({ sku: 'GR-22K-001', product: { id: 'prod-1' } }),
    };
    mockScaleService = {
      processReading: vi.fn().mockReturnValue({ weightMg: 5000, unit: 'g', display: '5.000g' }),
    };
    mockBiometricService = {
      processEvent: vi.fn().mockResolvedValue({ verified: true, userId: 'user-1' }),
    };
    mockDisplayService = {
      sendMessage: vi.fn().mockReturnValue({ formatted: 'Welcome!' }),
    };
    mockDeviceService = {
      updateDeviceStatus: vi.fn().mockResolvedValue(undefined),
    };

    gateway = new HardwareGateway(
      mockRfidService as any,
      mockBarcodeService as any,
      mockScaleService as any,
      mockBiometricService as any,
      mockDisplayService as any,
      mockDeviceService as any,
    );
    gateway.server = mockServer as any;
  });

  // ─── Connection Handling ─────────────────────────────────────

  it('client joins tenant and location rooms on connection', () => {
    const client = createMockClient();
    gateway.handleConnection(client);

    expect(client.join).toHaveBeenCalledWith('tenant:tenant-1');
    expect(client.join).toHaveBeenCalledWith('location:tenant-1:loc-1');
  });

  it('does not join rooms when tenantId or locationId missing', () => {
    const client = createMockClient({ tenantId: undefined, locationId: undefined });
    gateway.handleConnection(client);

    expect(client.join).not.toHaveBeenCalled();
  });

  it('handleDisconnect completes without error', () => {
    const client = createMockClient();
    expect(() => gateway.handleDisconnect(client)).not.toThrow();
  });

  // ─── Device Subscribe/Unsubscribe ───────────────────────────

  it('client joins room by device type and location on subscribe', () => {
    const client = createMockClient();
    gateway.handleSubscribe(client, { deviceType: 'rfid', locationId: 'loc-1' });

    expect(client.join).toHaveBeenCalledWith('rfid:tenant-1:loc-1');
  });

  it('client leaves room on unsubscribe', () => {
    const client = createMockClient();
    gateway.handleUnsubscribe(client, { deviceType: 'rfid', locationId: 'loc-1' });

    expect(client.leave).toHaveBeenCalledWith('rfid:tenant-1:loc-1');
  });

  it('subscribe does nothing when tenantId is missing', () => {
    const client = createMockClient({ tenantId: undefined });
    gateway.handleSubscribe(client, { deviceType: 'rfid', locationId: 'loc-1' });

    expect(client.join).not.toHaveBeenCalled();
  });

  // ─── RFID Scan ──────────────────────────────────────────────

  it('RFID scan event is processed and broadcasted to room', async () => {
    const client = createMockClient();
    const data = {
      tags: [{ epc: 'E200001', rssi: -50 }],
      readerDeviceId: 'rfid-reader-1',
      locationId: 'loc-1',
    };

    await gateway.handleRfidScan(client, data as any);

    expect(mockRfidService.processScans).toHaveBeenCalledWith('tenant-1', data);
    expect(mockServer.to).toHaveBeenCalledWith('rfid:tenant-1:loc-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'hardware:rfid:scan',
      expect.objectContaining({
        tags: data.tags,
        readerDeviceId: 'rfid-reader-1',
      }),
    );
  });

  it('RFID scan does nothing when tenantId is missing', async () => {
    const client = createMockClient({ tenantId: undefined });
    await gateway.handleRfidScan(client, { tags: [], readerDeviceId: 'r1', locationId: 'loc-1' } as any);

    expect(mockRfidService.processScans).not.toHaveBeenCalled();
  });

  // ─── Barcode Scan ───────────────────────────────────────────

  it('barcode scan event is processed and broadcasted', async () => {
    const client = createMockClient();
    const data = {
      barcode: '1234567890',
      scannerDeviceId: 'scanner-1',
      locationId: 'loc-1',
    };

    await gateway.handleBarcodeScan(client, data as any);

    expect(mockBarcodeService.lookup).toHaveBeenCalledWith('tenant-1', '1234567890');
    expect(mockServer.to).toHaveBeenCalledWith('barcode:tenant-1:loc-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'hardware:barcode:scan',
      expect.objectContaining({
        barcode: '1234567890',
      }),
    );
  });

  // ─── Scale Reading ──────────────────────────────────────────

  it('scale reading event is processed and broadcasted', () => {
    const client = createMockClient();
    const data = {
      weightMg: 5000,
      unit: 'g',
      stable: true,
      locationId: 'loc-1',
    };

    gateway.handleScaleReading(client, data as any);

    expect(mockScaleService.processReading).toHaveBeenCalledWith('tenant-1', data);
    expect(mockServer.to).toHaveBeenCalledWith('scale:tenant-1:loc-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'hardware:scale:reading',
      expect.objectContaining({ weightMg: 5000 }),
    );
  });

  // ─── Biometric Event ───────────────────────────────────────

  it('biometric event is processed and broadcasted', async () => {
    const client = createMockClient();
    const data = {
      eventType: 'FINGERPRINT_SCAN',
      deviceId: 'bio-1',
      locationId: 'loc-1',
    };

    await gateway.handleBiometricEvent(client, data as any);

    expect(mockBiometricService.processEvent).toHaveBeenCalledWith('tenant-1', data);
    expect(mockServer.to).toHaveBeenCalledWith('biometric:tenant-1:loc-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'hardware:biometric:event',
      expect.objectContaining({ verified: true }),
    );
  });

  // ─── Device Status ─────────────────────────────────────────

  it('device CONNECTED status emits device_connected event', async () => {
    const client = createMockClient();
    const data = { deviceId: 'dev-1', status: 'CONNECTED', locationId: 'loc-1' };

    await gateway.handleDeviceStatus(client, data);

    expect(mockDeviceService.updateDeviceStatus).toHaveBeenCalledWith(
      'tenant-1',
      'dev-1',
      'CONNECTED',
    );
    expect(mockServer.to).toHaveBeenCalledWith('location:tenant-1:loc-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'hardware:device:connected',
      expect.objectContaining({
        deviceId: 'dev-1',
        status: 'CONNECTED',
      }),
    );
  });

  it('device DISCONNECTED status emits device_disconnected event', async () => {
    const client = createMockClient();
    const data = { deviceId: 'dev-1', status: 'DISCONNECTED', locationId: 'loc-1' };

    await gateway.handleDeviceStatus(client, data);

    expect(mockServer.to).toHaveBeenCalledWith('location:tenant-1:loc-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'hardware:device:disconnected',
      expect.objectContaining({
        deviceId: 'dev-1',
        status: 'DISCONNECTED',
      }),
    );
  });

  it('device status handles error when device not registered', async () => {
    mockDeviceService.updateDeviceStatus.mockRejectedValue(new Error('Device not found'));
    const client = createMockClient();
    const data = { deviceId: 'unknown-dev', status: 'CONNECTED', locationId: 'loc-1' };

    // Should not throw, the handler catches the error
    await expect(gateway.handleDeviceStatus(client, data)).resolves.not.toThrow();

    // Event should still be emitted even if status update fails
    expect(mockEmit).toHaveBeenCalled();
  });

  // ─── Display Send ──────────────────────────────────────────

  it('display send message is formatted and broadcasted', () => {
    const client = createMockClient();
    const data = {
      title: 'Welcome',
      body: 'Thank you for visiting!',
      locationId: 'loc-1',
    };

    gateway.handleDisplaySend(client, data as any);

    expect(mockDisplayService.sendMessage).toHaveBeenCalledWith('tenant-1', data);
    expect(mockServer.to).toHaveBeenCalledWith('display:tenant-1:loc-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'hardware:display:update',
      expect.objectContaining({ formatted: 'Welcome!' }),
    );
  });

  // ─── Public Emit Methods ───────────────────────────────────

  it('emitToLocation broadcasts to correct room', () => {
    gateway.emitToLocation('tenant-1', 'loc-1', 'test:event', { data: 'test' });

    expect(mockServer.to).toHaveBeenCalledWith('location:tenant-1:loc-1');
    expect(mockEmit).toHaveBeenCalledWith('test:event', { data: 'test' });
  });

  it('emitToDeviceRoom broadcasts to correct device room', () => {
    gateway.emitToDeviceRoom('tenant-1', 'loc-1', 'rfid', 'scan:result', { tagId: 'abc' });

    expect(mockServer.to).toHaveBeenCalledWith('rfid:tenant-1:loc-1');
    expect(mockEmit).toHaveBeenCalledWith('scan:result', { tagId: 'abc' });
  });
});
