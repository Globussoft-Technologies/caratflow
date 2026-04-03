// ─── Hardware WebSocket Gateway ───────────────────────────────
// Real-time device communication via WebSocket.
// Rooms per device type per location (e.g., rfid:location-123).

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { HardwareWebSocketEvents } from '@caratflow/shared-types';
import type {
  RfidScanResult,
  BarcodeScanResult,
  WeightReading,
  BiometricEvent,
  CustomerDisplayMessage,
} from '@caratflow/shared-types';
import { HardwareRfidService } from './hardware.rfid.service';
import { HardwareBarcodeService } from './hardware.barcode.service';
import { HardwareScaleService } from './hardware.scale.service';
import { HardwareBiometricService } from './hardware.biometric.service';
import { HardwareDisplayService } from './hardware.display.service';
import { HardwareDeviceService } from './hardware.device.service';

@Injectable()
@WebSocketGateway({
  namespace: '/hardware',
  cors: { origin: '*' },
})
export class HardwareGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly rfidService: HardwareRfidService,
    private readonly barcodeService: HardwareBarcodeService,
    private readonly scaleService: HardwareScaleService,
    private readonly biometricService: HardwareBiometricService,
    private readonly displayService: HardwareDisplayService,
    private readonly deviceService: HardwareDeviceService,
  ) {}

  afterInit(): void {
    // Gateway initialized
  }

  handleConnection(client: Socket): void {
    const tenantId = client.handshake.auth?.tenantId as string | undefined;
    const locationId = client.handshake.auth?.locationId as string | undefined;

    if (tenantId && locationId) {
      // Join room for this tenant's location
      void client.join(`tenant:${tenantId}`);
      void client.join(`location:${tenantId}:${locationId}`);
    }
  }

  handleDisconnect(_client: Socket): void {
    // Client disconnected, rooms are auto-cleaned by socket.io
  }

  /**
   * Subscribe to a specific device type room.
   * Client sends: { deviceType: 'rfid' | 'barcode' | 'scale' | ..., locationId: string }
   */
  @SubscribeMessage('subscribe:device')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceType: string; locationId: string },
  ): void {
    const tenantId = client.handshake.auth?.tenantId as string;
    if (!tenantId) return;

    const room = `${data.deviceType}:${tenantId}:${data.locationId}`;
    void client.join(room);
  }

  /**
   * Unsubscribe from a device type room.
   */
  @SubscribeMessage('unsubscribe:device')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceType: string; locationId: string },
  ): void {
    const tenantId = client.handshake.auth?.tenantId as string;
    if (!tenantId) return;

    const room = `${data.deviceType}:${tenantId}:${data.locationId}`;
    void client.leave(room);
  }

  /**
   * Handle RFID scan event from a device.
   */
  @SubscribeMessage('rfid:scan')
  async handleRfidScan(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RfidScanResult & { locationId: string },
  ): Promise<void> {
    const tenantId = client.handshake.auth?.tenantId as string;
    if (!tenantId) return;

    const results = await this.rfidService.processScans(tenantId, data);

    // Broadcast to the RFID room for this location
    const room = `rfid:${tenantId}:${data.locationId}`;
    this.server.to(room).emit(HardwareWebSocketEvents.RFID_SCAN, {
      tags: data.tags,
      lookupResults: results,
      readerDeviceId: data.readerDeviceId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle barcode scan event from a device.
   */
  @SubscribeMessage('barcode:scan')
  async handleBarcodeScan(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: BarcodeScanResult & { locationId: string },
  ): Promise<void> {
    const tenantId = client.handshake.auth?.tenantId as string;
    if (!tenantId) return;

    const lookupResult = await this.barcodeService.lookup(tenantId, data.barcode);

    const room = `barcode:${tenantId}:${data.locationId}`;
    this.server.to(room).emit(HardwareWebSocketEvents.BARCODE_SCAN, {
      ...data,
      lookupResult,
    });
  }

  /**
   * Handle weight reading from a scale.
   */
  @SubscribeMessage('scale:reading')
  handleScaleReading(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WeightReading & { locationId: string },
  ): void {
    const tenantId = client.handshake.auth?.tenantId as string;
    if (!tenantId) return;

    const processed = this.scaleService.processReading(tenantId, data);

    const room = `scale:${tenantId}:${data.locationId}`;
    this.server.to(room).emit(HardwareWebSocketEvents.SCALE_READING, processed);
  }

  /**
   * Handle biometric event from a device.
   */
  @SubscribeMessage('biometric:event')
  async handleBiometricEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: BiometricEvent & { locationId: string },
  ): Promise<void> {
    const tenantId = client.handshake.auth?.tenantId as string;
    if (!tenantId) return;

    const result = await this.biometricService.processEvent(tenantId, data);

    const room = `biometric:${tenantId}:${data.locationId}`;
    this.server.to(room).emit(HardwareWebSocketEvents.BIOMETRIC_EVENT, result);
  }

  /**
   * Handle device connection status update.
   */
  @SubscribeMessage('device:status')
  async handleDeviceStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string; status: string; locationId: string },
  ): Promise<void> {
    const tenantId = client.handshake.auth?.tenantId as string;
    if (!tenantId) return;

    try {
      await this.deviceService.updateDeviceStatus(
        tenantId,
        data.deviceId,
        data.status as 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'INITIALIZING',
      );
    } catch {
      // Device may not be registered yet
    }

    const event = data.status === 'CONNECTED'
      ? HardwareWebSocketEvents.DEVICE_CONNECTED
      : HardwareWebSocketEvents.DEVICE_DISCONNECTED;

    const room = `location:${tenantId}:${data.locationId}`;
    this.server.to(room).emit(event, {
      deviceId: data.deviceId,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send a message to customer display.
   */
  @SubscribeMessage('display:send')
  handleDisplaySend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CustomerDisplayMessage & { locationId: string },
  ): void {
    const tenantId = client.handshake.auth?.tenantId as string;
    if (!tenantId) return;

    const formatted = this.displayService.sendMessage(tenantId, data);

    const room = `display:${tenantId}:${data.locationId}`;
    this.server.to(room).emit(HardwareWebSocketEvents.DISPLAY_UPDATE, formatted);
  }

  // ─── Public Methods for Service-to-Gateway Communication ────

  /**
   * Emit an event to a specific location room. Used by services.
   */
  emitToLocation(tenantId: string, locationId: string, event: string, data: unknown): void {
    const room = `location:${tenantId}:${locationId}`;
    this.server.to(room).emit(event, data);
  }

  /**
   * Emit an event to a specific device type room. Used by services.
   */
  emitToDeviceRoom(
    tenantId: string,
    locationId: string,
    deviceType: string,
    event: string,
    data: unknown,
  ): void {
    const room = `${deviceType}:${tenantId}:${locationId}`;
    this.server.to(room).emit(event, data);
  }
}
