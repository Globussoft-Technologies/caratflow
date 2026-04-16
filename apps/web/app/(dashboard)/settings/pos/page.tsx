'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Save } from 'lucide-react';
import { trpc } from '@/lib/trpc';

type PosConfig = {
  'billing.invoicePrefix': string;
  'billing.invoiceNumberStart': number;
  'billing.creditNotePrefix': string;
  'billing.estimatePrefix': string;
  'pos.roundingMethod': string;
  'pos.roundingPrecision': number;
  'pos.receiptFormat': string;
  'pos.defaultPaymentMethod': string;
  'pos.printOnSale': boolean;
  'pos.showBarcode': boolean;
  'billing.termsAndConditions': string;
};

const defaults: PosConfig = {
  'billing.invoicePrefix': 'INV',
  'billing.invoiceNumberStart': 1,
  'billing.creditNotePrefix': 'CN',
  'billing.estimatePrefix': 'EST',
  'pos.roundingMethod': 'nearest',
  'pos.roundingPrecision': 100,
  'pos.receiptFormat': 'standard',
  'pos.defaultPaymentMethod': 'CASH',
  'pos.printOnSale': true,
  'pos.showBarcode': true,
  'billing.termsAndConditions': '',
};

const billingKeys = new Set<keyof PosConfig>([
  'billing.invoicePrefix',
  'billing.invoiceNumberStart',
  'billing.creditNotePrefix',
  'billing.estimatePrefix',
  'billing.termsAndConditions',
]);

function categoryFor(key: keyof PosConfig): 'billing' | 'pos' {
  return billingKeys.has(key) ? 'billing' : 'pos';
}

export default function PosSettingsPage() {
  const [config, setConfig] = useState<PosConfig>(defaults);

  const { data: loaded, isLoading, refetch } = trpc.platform.settings.getAll.useQuery();
  const setSettingsMutation = trpc.platform.settings.set.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  useEffect(() => {
    if (!loaded) return;
    const grouped = (loaded as { grouped?: Record<string, Record<string, unknown>> } | Record<string, Record<string, unknown>> | undefined);
    const source = (grouped && typeof grouped === 'object' && 'grouped' in grouped
      ? (grouped as { grouped?: Record<string, Record<string, unknown>> }).grouped
      : (grouped as Record<string, Record<string, unknown>> | undefined)) ?? {};
    const billing = source.billing ?? {};
    const pos = source.pos ?? {};
    setConfig((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(defaults) as Array<keyof PosConfig>) {
        const bucket = categoryFor(key) === 'billing' ? billing : pos;
        if (bucket[key] !== undefined) {
          (next as Record<string, unknown>)[key] = bucket[key];
        }
      }
      return next;
    });
  }, [loaded]);

  const handleSave = () => {
    const payload = (Object.keys(config) as Array<keyof PosConfig>).map((key) => ({
      key,
      value: config[key],
      category: categoryFor(key),
    }));
    setSettingsMutation.mutate({ settings: payload });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="POS Settings"
        description="Configure point-of-sale, invoicing, and receipt settings."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'POS Settings' },
        ]}
      />

      {setSettingsMutation.isSuccess && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          POS settings saved successfully.
        </div>
      )}
      {setSettingsMutation.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to save: {setSettingsMutation.error.message}
        </div>
      )}

      {/* Invoice Numbering */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Invoice Numbering</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="inv-prefix">Invoice Prefix</label>
            <input id="inv-prefix" type="text" value={config['billing.invoicePrefix']} onChange={(e) => setConfig({ ...config, 'billing.invoicePrefix': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-muted-foreground">e.g., INV-0001</p>
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="inv-start">Starting Number</label>
            <input id="inv-start" type="number" value={config['billing.invoiceNumberStart']} onChange={(e) => setConfig({ ...config, 'billing.invoiceNumberStart': Number(e.target.value) })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" min={1} />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="cn-prefix">Credit Note Prefix</label>
            <input id="cn-prefix" type="text" value={config['billing.creditNotePrefix']} onChange={(e) => setConfig({ ...config, 'billing.creditNotePrefix': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="est-prefix">Estimate Prefix</label>
            <input id="est-prefix" type="text" value={config['billing.estimatePrefix']} onChange={(e) => setConfig({ ...config, 'billing.estimatePrefix': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Rounding & Payment */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Rounding & Payment</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium" htmlFor="rounding-method">Rounding Method</label>
            <select id="rounding-method" value={config['pos.roundingMethod']} onChange={(e) => setConfig({ ...config, 'pos.roundingMethod': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
              <option value="nearest">Nearest</option>
              <option value="up">Round Up</option>
              <option value="down">Round Down</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="rounding-precision">Rounding Precision (paise)</label>
            <select id="rounding-precision" value={config['pos.roundingPrecision']} onChange={(e) => setConfig({ ...config, 'pos.roundingPrecision': Number(e.target.value) })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
              <option value={1}>1 paisa</option>
              <option value={50}>50 paise</option>
              <option value={100}>1 rupee</option>
              <option value={500}>5 rupees</option>
              <option value={1000}>10 rupees</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="default-payment">Default Payment Method</label>
            <select id="default-payment" value={config['pos.defaultPaymentMethod']} onChange={(e) => setConfig({ ...config, 'pos.defaultPaymentMethod': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Receipt */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Receipt Settings</h2>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium" htmlFor="receipt-format">Receipt Template</label>
            <select id="receipt-format" value={config['pos.receiptFormat']} onChange={(e) => setConfig({ ...config, 'pos.receiptFormat': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm md:w-1/3">
              <option value="standard">Standard</option>
              <option value="compact">Compact (thermal)</option>
              <option value="detailed">Detailed (A4)</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input id="print-on-sale" type="checkbox" checked={config['pos.printOnSale']} onChange={(e) => setConfig({ ...config, 'pos.printOnSale': e.target.checked })} className="h-4 w-4 rounded border" />
            <label htmlFor="print-on-sale" className="text-sm font-medium">Auto-print receipt on sale completion</label>
          </div>
          <div className="flex items-center gap-3">
            <input id="show-barcode" type="checkbox" checked={config['pos.showBarcode']} onChange={(e) => setConfig({ ...config, 'pos.showBarcode': e.target.checked })} className="h-4 w-4 rounded border" />
            <label htmlFor="show-barcode" className="text-sm font-medium">Show barcode scanner in POS</label>
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="terms">Default Terms & Conditions</label>
            <textarea id="terms" value={config['billing.termsAndConditions']} onChange={(e) => setConfig({ ...config, 'billing.termsAndConditions': e.target.value })} rows={4} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="Terms and conditions printed on invoices..." />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={setSettingsMutation.isPending || isLoading} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Save className="h-4 w-4" />
          {setSettingsMutation.isPending ? 'Saving...' : 'Save POS Settings'}
        </button>
      </div>
    </div>
  );
}
