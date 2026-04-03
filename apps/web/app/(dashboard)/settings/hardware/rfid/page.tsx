'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { RfidScanMonitor } from '@/features/hardware/RfidScanMonitor';
import { RfidStockTakeWizard } from '@/features/hardware/RfidStockTakeWizard';

type ActiveTab = 'stock-take' | 'encode' | 'monitor' | 'anti-theft';

export default function RfidManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('stock-take');
  const [encodeSerial, setEncodeSerial] = useState('');
  const [encodeTagData, setEncodeTagData] = useState('');
  const [encodeSerialId, setEncodeSerialId] = useState('');
  const [monitorLocationId, setMonitorLocationId] = useState('');
  const [antiTheftEpc, setAntiTheftEpc] = useState('');
  const [antiTheftLocationId, setAntiTheftLocationId] = useState('');

  const writeTagMutation = trpc.hardware.rfid.writeTag.useMutation({
    onSuccess: () => {
      setEncodeSerial('');
      setEncodeTagData('');
      setEncodeSerialId('');
    },
  });

  const antiTheftQuery = trpc.hardware.rfid.antiTheftCheck.useQuery(
    { tagId: antiTheftEpc, epc: antiTheftEpc, locationId: antiTheftLocationId },
    { enabled: false },
  );

  const handleEncodeTag = () => {
    if (!encodeSerialId || !encodeTagData) return;
    writeTagMutation.mutate({
      serialNumberId: encodeSerialId,
      data: { tagId: encodeTagData, data: encodeTagData },
    });
  };

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'stock-take', label: 'Stock Take' },
    { id: 'encode', label: 'Tag Encoding' },
    { id: 'monitor', label: 'Scan Monitor' },
    { id: 'anti-theft', label: 'Anti-Theft' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="RFID Management"
        description="RFID-based stock taking, tag encoding, scan monitoring, and anti-theft configuration."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Hardware', href: '/settings/hardware' },
          { label: 'RFID Management' },
        ]}
      />

      {/* Tab Navigation */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock Take Tab */}
      {activeTab === 'stock-take' && (
        <RfidStockTakeWizard />
      )}

      {/* Tag Encoding Tab */}
      {activeTab === 'encode' && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Encode RFID Tag</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Associate an RFID tag with a product serial number by writing the EPC data to the tag.
          </p>
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium" htmlFor="encode-serial-id">Serial Number ID</label>
              <input
                id="encode-serial-id"
                type="text"
                value={encodeSerialId}
                onChange={(e) => setEncodeSerialId(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="UUID of the serial number record"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="encode-tag-data">RFID Tag EPC Data</label>
              <input
                id="encode-tag-data"
                type="text"
                value={encodeTagData}
                onChange={(e) => setEncodeTagData(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="EPC code to write to the tag"
              />
            </div>
            <button
              onClick={handleEncodeTag}
              disabled={!encodeSerialId || !encodeTagData || writeTagMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {writeTagMutation.isPending ? 'Writing...' : 'Write Tag'}
            </button>
            {writeTagMutation.isSuccess && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                Tag encoded successfully.
              </div>
            )}
            {writeTagMutation.isError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Failed to encode tag: {writeTagMutation.error.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan Monitor Tab */}
      {activeTab === 'monitor' && (
        <div className="space-y-4">
          <div className="max-w-md">
            <label className="block text-sm font-medium" htmlFor="monitor-location">Location ID</label>
            <input
              id="monitor-location"
              type="text"
              value={monitorLocationId}
              onChange={(e) => setMonitorLocationId(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Enter location UUID to monitor"
            />
          </div>
          {monitorLocationId && (
            <RfidScanMonitor locationId={monitorLocationId} />
          )}
        </div>
      )}

      {/* Anti-Theft Tab */}
      {activeTab === 'anti-theft' && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Anti-Theft Check</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Validate an RFID tag at exit points. Items with status "SOLD" or "IN_TRANSIT" are authorized to leave.
          </p>
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium" htmlFor="at-epc">Tag EPC Code</label>
              <input
                id="at-epc"
                type="text"
                value={antiTheftEpc}
                onChange={(e) => setAntiTheftEpc(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="EPC code from tag"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="at-location">Location ID</label>
              <input
                id="at-location"
                type="text"
                value={antiTheftLocationId}
                onChange={(e) => setAntiTheftLocationId(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Exit point location UUID"
              />
            </div>
            <button
              onClick={() => void antiTheftQuery.refetch()}
              disabled={!antiTheftEpc || !antiTheftLocationId || antiTheftQuery.isFetching}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {antiTheftQuery.isFetching ? 'Checking...' : 'Check Tag'}
            </button>
            {antiTheftQuery.data && (
              <div
                className={`rounded-md border p-4 ${
                  antiTheftQuery.data.isAuthorized
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <p
                  className={`text-lg font-bold ${
                    antiTheftQuery.data.isAuthorized ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {antiTheftQuery.data.isAuthorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}
                </p>
                {antiTheftQuery.data.productName && (
                  <p className="text-sm">Product: {antiTheftQuery.data.productName}</p>
                )}
                {antiTheftQuery.data.serialNumber && (
                  <p className="text-sm">Serial: {antiTheftQuery.data.serialNumber}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{antiTheftQuery.data.reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
