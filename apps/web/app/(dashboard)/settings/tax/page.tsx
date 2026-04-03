'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Save } from 'lucide-react';

export default function TaxConfigPage() {
  const [config, setConfig] = useState({
    'tax.gstin': '',
    'tax.pan': '',
    'tax.stateCode': '',
    'tax.defaultGstRate': 3,
    'tax.makingChargesGstRate': 5,
    'tax.tdsEnabled': false,
    'tax.tcsEnabled': false,
    'tax.tdsThresholdPaise': 5000000,
    'tax.tcsThresholdPaise': 5000000,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Call trpc.platform.settings.set.mutate
      console.log('Saving tax config:', config);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Configuration"
        description="Configure GST, TDS, and TCS settings for your business."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Tax Configuration' },
        ]}
      />

      {/* GST Settings */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">GST Information</h2>
          <p className="text-sm text-muted-foreground">Your Goods and Services Tax registration details.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium" htmlFor="gstin">GSTIN</label>
            <input id="gstin" type="text" value={config['tax.gstin']} onChange={(e) => setConfig({ ...config, 'tax.gstin': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="27AABCS1429B1Z5" maxLength={15} />
            <p className="mt-1 text-xs text-muted-foreground">15-character GST Identification Number</p>
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="pan">PAN</label>
            <input id="pan" type="text" value={config['tax.pan']} onChange={(e) => setConfig({ ...config, 'tax.pan': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="AABCS1429B" maxLength={10} />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="state-code">State Code</label>
            <input id="state-code" type="text" value={config['tax.stateCode']} onChange={(e) => setConfig({ ...config, 'tax.stateCode': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="27" maxLength={2} />
            <p className="mt-1 text-xs text-muted-foreground">First 2 digits of GSTIN</p>
          </div>
        </div>
      </div>

      {/* Default Rates */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Default Tax Rates</h2>
          <p className="text-sm text-muted-foreground">Default GST rates applied to sales. HSN 7113 for jewelry.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="gst-rate">Jewelry GST Rate (%)</label>
            <input id="gst-rate" type="number" value={config['tax.defaultGstRate']} onChange={(e) => setConfig({ ...config, 'tax.defaultGstRate': Number(e.target.value) })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" min={0} max={28} step={0.5} />
            <p className="mt-1 text-xs text-muted-foreground">Standard rate for gold/silver jewelry: 3%</p>
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="making-gst">Making Charges GST Rate (%)</label>
            <input id="making-gst" type="number" value={config['tax.makingChargesGstRate']} onChange={(e) => setConfig({ ...config, 'tax.makingChargesGstRate': Number(e.target.value) })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" min={0} max={28} step={0.5} />
            <p className="mt-1 text-xs text-muted-foreground">Standard rate for making/labour charges: 5%</p>
          </div>
        </div>
      </div>

      {/* TDS/TCS */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">TDS & TCS</h2>
          <p className="text-sm text-muted-foreground">Tax Deducted/Collected at Source thresholds (Section 194Q / 206C).</p>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <p className="font-medium">TDS (Section 194Q)</p>
              <p className="text-sm text-muted-foreground">Deduct TDS on purchases exceeding threshold</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" checked={config['tax.tdsEnabled']} onChange={(e) => setConfig({ ...config, 'tax.tdsEnabled': e.target.checked })} className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>
          {config['tax.tdsEnabled'] && (
            <div className="pl-4">
              <label className="block text-sm font-medium" htmlFor="tds-threshold">TDS Threshold (INR)</label>
              <input id="tds-threshold" type="number" value={config['tax.tdsThresholdPaise'] / 100} onChange={(e) => setConfig({ ...config, 'tax.tdsThresholdPaise': Number(e.target.value) * 100 })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm md:w-1/2" />
              <p className="mt-1 text-xs text-muted-foreground">Default: Rs. 50,00,000 (50 lakh)</p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <p className="font-medium">TCS (Section 206C)</p>
              <p className="text-sm text-muted-foreground">Collect TCS on sales exceeding threshold</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" checked={config['tax.tcsEnabled']} onChange={(e) => setConfig({ ...config, 'tax.tcsEnabled': e.target.checked })} className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>
          {config['tax.tcsEnabled'] && (
            <div className="pl-4">
              <label className="block text-sm font-medium" htmlFor="tcs-threshold">TCS Threshold (INR)</label>
              <input id="tcs-threshold" type="number" value={config['tax.tcsThresholdPaise'] / 100} onChange={(e) => setConfig({ ...config, 'tax.tcsThresholdPaise': Number(e.target.value) * 100 })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm md:w-1/2" />
              <p className="mt-1 text-xs text-muted-foreground">Default: Rs. 50,00,000 (50 lakh)</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Tax Settings'}
        </button>
      </div>
    </div>
  );
}
