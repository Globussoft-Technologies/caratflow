'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { Save } from 'lucide-react';

export default function BranchDetailPage() {
  const params = useParams<{ id: string }>();
  const branchId = params.id;

  // TODO: Fetch branch from API
  const [branch, setBranch] = useState({
    name: '',
    locationType: 'SHOWROOM',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
  });

  const [branchSettings, setBranchSettings] = useState({
    taxConfig: { gstNumber: '', stateCode: '', defaultGstRate: 3 },
    workingHours: { start: '10:00', end: '20:00', daysOff: [0] },
    defaultRates: { makingChargesPercent: 10, wastagePercent: 3 },
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Call trpc.platform.branches.update.mutate and trpc.platform.branches.updateSettings.mutate
      console.log('Saving branch:', branchId, branch, branchSettings);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Details"
        description="View and edit branch information and settings."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Branches', href: '/settings/branches' },
          { label: branch.name || 'Branch' },
        ]}
      />

      {/* General Info */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">General Information</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="name">Name</label>
            <input id="name" type="text" value={branch.name} onChange={(e) => setBranch({ ...branch, name: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="type">Type</label>
            <select id="type" value={branch.locationType} onChange={(e) => setBranch({ ...branch, locationType: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
              <option value="SHOWROOM">Showroom</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="OFFICE">Office</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="city">City</label>
            <input id="city" type="text" value={branch.city} onChange={(e) => setBranch({ ...branch, city: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="state">State</label>
            <input id="state" type="text" value={branch.state} onChange={(e) => setBranch({ ...branch, state: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="phone">Phone</label>
            <input id="phone" type="text" value={branch.phone} onChange={(e) => setBranch({ ...branch, phone: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="email">Email</label>
            <input id="email" type="email" value={branch.email} onChange={(e) => setBranch({ ...branch, email: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium" htmlFor="address">Address</label>
            <textarea id="address" value={branch.address} onChange={(e) => setBranch({ ...branch, address: e.target.value })} rows={2} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Tax Config */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Tax Configuration</h2>
          <p className="text-sm text-muted-foreground">Branch-level tax settings override global defaults.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium" htmlFor="gst">GST Number</label>
            <input id="gst" type="text" value={branchSettings.taxConfig.gstNumber} onChange={(e) => setBranchSettings({ ...branchSettings, taxConfig: { ...branchSettings.taxConfig, gstNumber: e.target.value } })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="27AABCS1429B1Z5" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="state-code">State Code</label>
            <input id="state-code" type="text" value={branchSettings.taxConfig.stateCode} onChange={(e) => setBranchSettings({ ...branchSettings, taxConfig: { ...branchSettings.taxConfig, stateCode: e.target.value } })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="27" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="gst-rate">Default GST Rate (%)</label>
            <input id="gst-rate" type="number" value={branchSettings.taxConfig.defaultGstRate} onChange={(e) => setBranchSettings({ ...branchSettings, taxConfig: { ...branchSettings.taxConfig, defaultGstRate: Number(e.target.value) } })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Working Hours</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="start-time">Opening Time</label>
            <input id="start-time" type="time" value={branchSettings.workingHours.start} onChange={(e) => setBranchSettings({ ...branchSettings, workingHours: { ...branchSettings.workingHours, start: e.target.value } })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="end-time">Closing Time</label>
            <input id="end-time" type="time" value={branchSettings.workingHours.end} onChange={(e) => setBranchSettings({ ...branchSettings, workingHours: { ...branchSettings.workingHours, end: e.target.value } })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Default Rates */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Default Rates</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="making-charges">Making Charges (%)</label>
            <input id="making-charges" type="number" value={branchSettings.defaultRates.makingChargesPercent} onChange={(e) => setBranchSettings({ ...branchSettings, defaultRates: { ...branchSettings.defaultRates, makingChargesPercent: Number(e.target.value) } })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="wastage">Wastage (%)</label>
            <input id="wastage" type="number" value={branchSettings.defaultRates.wastagePercent} onChange={(e) => setBranchSettings({ ...branchSettings, defaultRates: { ...branchSettings.defaultRates, wastagePercent: Number(e.target.value) } })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
