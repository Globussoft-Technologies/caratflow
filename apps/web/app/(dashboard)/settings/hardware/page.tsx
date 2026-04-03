'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { DeviceType, DeviceStatus } from '@caratflow/shared-types';
import type { DeviceConfigResponse, CreateDeviceConfig } from '@caratflow/shared-types';
import { DeviceStatusIndicator } from '@/features/hardware/DeviceStatusIndicator';
import { DeviceConfigForm } from '@/features/hardware/DeviceConfigForm';
import { Plus, Settings2, Trash2, Wifi } from 'lucide-react';

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  [DeviceType.RFID_READER]: 'RFID Reader',
  [DeviceType.BARCODE_SCANNER]: 'Barcode Scanner',
  [DeviceType.WEIGHING_SCALE]: 'Weighing Scale',
  [DeviceType.LABEL_PRINTER]: 'Label Printer',
  [DeviceType.CUSTOMER_DISPLAY]: 'Customer Display',
  [DeviceType.BIOMETRIC]: 'Biometric Device',
};

export default function HardwareSettingsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<DeviceType | ''>('');

  const { data: devicesData, isLoading, refetch } = trpc.hardware.devices.list.useQuery({
    page: 1,
    limit: 50,
    deviceType: filterType || undefined,
  });

  const registerMutation = trpc.hardware.devices.register.useMutation({
    onSuccess: () => {
      setShowAddForm(false);
      void refetch();
    },
  });

  const removeMutation = trpc.hardware.devices.remove.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleRegister = (config: CreateDeviceConfig) => {
    registerMutation.mutate(config);
  };

  const handleRemove = (deviceId: string) => {
    if (window.confirm('Remove this device?')) {
      removeMutation.mutate({ deviceId });
    }
  };

  const devices = devicesData?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hardware Devices"
        description="Manage connected hardware devices: RFID readers, barcode scanners, scales, printers, displays, and biometric devices."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Hardware' },
        ]}
      />

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <a
          href="/settings/hardware/labels"
          className="rounded-lg border p-4 hover:bg-muted/50"
        >
          <h3 className="text-sm font-semibold">Label Templates</h3>
          <p className="text-xs text-muted-foreground">Manage jewelry label designs</p>
        </a>
        <a
          href="/settings/hardware/rfid"
          className="rounded-lg border p-4 hover:bg-muted/50"
        >
          <h3 className="text-sm font-semibold">RFID Management</h3>
          <p className="text-xs text-muted-foreground">Stock take, tag encoding, anti-theft</p>
        </a>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Device Status</h3>
          <p className="text-xs text-muted-foreground">
            {devices.filter((d) => d.status === DeviceStatus.CONNECTED).length} of{' '}
            {devices.length} devices connected
          </p>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DeviceType | '')}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">All Device Types</option>
            {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Device
        </button>
      </div>

      {/* Add Device Form */}
      {showAddForm && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Register New Device</h2>
          <DeviceConfigForm
            onSubmit={handleRegister}
            onCancel={() => setShowAddForm(false)}
            isLoading={registerMutation.isPending}
          />
        </div>
      )}

      {/* Device List */}
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading devices...</div>
      ) : devices.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No hardware devices registered. Click "Add Device" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device: DeviceConfigResponse) => (
            <div key={device.id} className="rounded-lg border bg-card shadow-sm">
              <div className="flex items-start justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <DeviceStatusIndicator
                      deviceId={device.id}
                      initialStatus={(device.status as DeviceStatus) ?? DeviceStatus.DISCONNECTED}
                    />
                    <h3 className="truncate text-sm font-semibold">{device.name}</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {DEVICE_TYPE_LABELS[device.deviceType]} | {device.connectionType}
                  </p>
                  {device.ipAddress && (
                    <p className="text-xs text-muted-foreground">
                      {device.ipAddress}{device.tcpPort ? `:${device.tcpPort}` : ''}
                    </p>
                  )}
                  {device.port && (
                    <p className="text-xs text-muted-foreground">Port: {device.port}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                    device.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {device.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex border-t">
                <a
                  href={`/settings/hardware/${device.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Configure
                </a>
                <button
                  onClick={() => handleRemove(device.id)}
                  disabled={removeMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-1.5 border-l py-2 text-xs font-medium text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
