'use client';

import { useState } from 'react';
import { DeviceType, ConnectionType } from '@caratflow/shared-types';
import type { CreateDeviceConfig } from '@caratflow/shared-types';

interface DeviceConfigFormProps {
  onSubmit: (config: CreateDeviceConfig) => void;
  onCancel: () => void;
  initialValues?: Partial<CreateDeviceConfig>;
  isLoading?: boolean;
}

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  [DeviceType.RFID_READER]: 'RFID Reader',
  [DeviceType.BARCODE_SCANNER]: 'Barcode Scanner',
  [DeviceType.WEIGHING_SCALE]: 'Weighing Scale',
  [DeviceType.LABEL_PRINTER]: 'Label Printer',
  [DeviceType.CUSTOMER_DISPLAY]: 'Customer Display',
  [DeviceType.BIOMETRIC]: 'Biometric Device',
};

const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  [ConnectionType.USB_HID]: 'USB HID',
  [ConnectionType.USB_SERIAL]: 'USB Serial (COM Port)',
  [ConnectionType.BLUETOOTH]: 'Bluetooth',
  [ConnectionType.NETWORK_TCP]: 'Network (TCP)',
  [ConnectionType.NETWORK_HTTP]: 'Network (HTTP)',
};

/**
 * Form for registering or editing a hardware device configuration.
 */
export function DeviceConfigForm({
  onSubmit,
  onCancel,
  initialValues,
  isLoading = false,
}: DeviceConfigFormProps) {
  const [formData, setFormData] = useState({
    name: initialValues?.name ?? '',
    deviceType: initialValues?.deviceType ?? DeviceType.BARCODE_SCANNER,
    connectionType: initialValues?.connectionType ?? ConnectionType.USB_HID,
    port: initialValues?.port ?? '',
    baudRate: initialValues?.baudRate ?? 9600,
    ipAddress: initialValues?.ipAddress ?? '',
    tcpPort: initialValues?.tcpPort ?? 0,
    vendorId: initialValues?.vendorId ?? '',
    productId: initialValues?.productId ?? '',
    isActive: initialValues?.isActive ?? true,
    locationId: initialValues?.locationId ?? '',
  });

  const showSerialFields = formData.connectionType === ConnectionType.USB_SERIAL;
  const showNetworkFields =
    formData.connectionType === ConnectionType.NETWORK_TCP ||
    formData.connectionType === ConnectionType.NETWORK_HTTP;
  const showUsbHidFields = formData.connectionType === ConnectionType.USB_HID;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      deviceType: formData.deviceType,
      connectionType: formData.connectionType,
      port: showSerialFields ? formData.port : undefined,
      baudRate: showSerialFields ? formData.baudRate : undefined,
      ipAddress: showNetworkFields ? formData.ipAddress : undefined,
      tcpPort: showNetworkFields && formData.tcpPort > 0 ? formData.tcpPort : undefined,
      vendorId: showUsbHidFields ? formData.vendorId : undefined,
      productId: showUsbHidFields ? formData.productId : undefined,
      settings: {},
      isActive: formData.isActive,
      locationId: formData.locationId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Device Name */}
      <div>
        <label className="block text-sm font-medium" htmlFor="device-name">Device Name</label>
        <input
          id="device-name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          placeholder="e.g., Front Counter Scale"
        />
      </div>

      {/* Device Type */}
      <div>
        <label className="block text-sm font-medium" htmlFor="device-type">Device Type</label>
        <select
          id="device-type"
          value={formData.deviceType}
          onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as DeviceType })}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        >
          {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Connection Type */}
      <div>
        <label className="block text-sm font-medium" htmlFor="connection-type">Connection Type</label>
        <select
          id="connection-type"
          value={formData.connectionType}
          onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as ConnectionType })}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        >
          {Object.entries(CONNECTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Location ID */}
      <div>
        <label className="block text-sm font-medium" htmlFor="location-id">Location ID</label>
        <input
          id="location-id"
          type="text"
          required
          value={formData.locationId}
          onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          placeholder="UUID of the location"
        />
      </div>

      {/* Serial Port Fields */}
      {showSerialFields && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="port">COM Port</label>
            <input
              id="port"
              type="text"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="COM3 or /dev/ttyUSB0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="baud-rate">Baud Rate</label>
            <select
              id="baud-rate"
              value={formData.baudRate}
              onChange={(e) => setFormData({ ...formData, baudRate: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              {[2400, 4800, 9600, 19200, 38400, 57600, 115200].map((rate) => (
                <option key={rate} value={rate}>{rate}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Network Fields */}
      {showNetworkFields && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="ip-address">IP Address</label>
            <input
              id="ip-address"
              type="text"
              value={formData.ipAddress}
              onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="tcp-port">TCP Port</label>
            <input
              id="tcp-port"
              type="number"
              value={formData.tcpPort || ''}
              onChange={(e) => setFormData({ ...formData, tcpPort: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="9100"
              min={1}
              max={65535}
            />
          </div>
        </div>
      )}

      {/* USB HID Fields */}
      {showUsbHidFields && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="vendor-id">Vendor ID</label>
            <input
              id="vendor-id"
              type="text"
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="0x1234"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="product-id">Product ID</label>
            <input
              id="product-id"
              type="text"
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="0x5678"
            />
          </div>
        </div>
      )}

      {/* Active Toggle */}
      <div className="flex items-center gap-3">
        <input
          id="is-active"
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="h-4 w-4 rounded border"
        />
        <label htmlFor="is-active" className="text-sm font-medium">Device is active</label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Device'}
        </button>
      </div>
    </form>
  );
}
