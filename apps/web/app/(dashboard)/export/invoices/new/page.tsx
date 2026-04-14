'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { Plus, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

type InvoiceType = 'COMMERCIAL' | 'PROFORMA' | 'CUSTOMS';

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPriceDecimal: number;
  hsCode: string;
  weightG: number;
  netWeightG: number;
}

export default function NewExportInvoicePage() {
  const router = useRouter();

  const [exportOrderId, setExportOrderId] = useState('');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('COMMERCIAL');
  const [buyerId, setBuyerId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [exchangeRateDecimal, setExchangeRateDecimal] = useState<number>(83.5);
  const [igstDecimal, setIgstDecimal] = useState<number>(0);
  const [lutNumber, setLutNumber] = useState('');
  const [lutDate, setLutDate] = useState('');
  const [adCode, setAdCode] = useState('');
  const [ieCode, setIeCode] = useState('');
  const [preCarriageBy, setPreCarriageBy] = useState('');
  const [placeOfReceipt, setPlaceOfReceipt] = useState('');
  const [vesselFlightNo, setVesselFlightNo] = useState('');
  const [portOfLoading, setPortOfLoading] = useState('');
  const [portOfDischarge, setPortOfDischarge] = useState('');
  const [finalDestination, setFinalDestination] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<InvoiceLine[]>([
    { description: '', quantity: 1, unitPriceDecimal: 0, hsCode: '7113', weightG: 0, netWeightG: 0 },
  ]);

  const ordersQuery = trpc.export.listOrders.useQuery({
    pagination: { page: 1, limit: 100, sortOrder: 'desc' },
  });
  const customersQuery = trpc.crm.customerList.useQuery({
    page: 1,
    limit: 100,
    sortOrder: 'desc',
  });

  const orders = ((ordersQuery.data as { data?: Array<{ id: string; orderNumber?: string; buyerId?: string }> } | undefined)?.data) ?? [];
  const customers = ((customersQuery.data as { data?: Array<{ id: string; firstName?: string; lastName?: string }> } | undefined)?.data) ?? [];

  const createMutation = trpc.export.createInvoice.useMutation({
    onSuccess: (result: unknown) => {
      const id = (result as { id?: string } | null)?.id;
      router.push(id ? `/export/invoices/${id}` : '/export/invoices');
    },
  });

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unitPriceDecimal: 0, hsCode: '7113', weightG: 0, netWeightG: 0 },
    ]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = <K extends keyof InvoiceLine>(i: number, f: K, v: InvoiceLine[K]) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [f]: v } : it)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      exportOrderId,
      invoiceType: invoiceType as never,
      buyerId,
      currencyCode: currencyCode.toUpperCase(),
      exchangeRate: Math.round(exchangeRateDecimal * 10000),
      items: items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPricePaise: Math.round(it.unitPriceDecimal * 100),
        hsCode: it.hsCode,
        weightMg: Math.round(it.weightG * 1000),
        netWeightMg: Math.round(it.netWeightG * 1000),
        countryOfOrigin: 'IN',
      })),
      igstPaise: Math.round(igstDecimal * 100),
      lutNumber: lutNumber || undefined,
      lutDate: lutDate ? new Date(lutDate) : undefined,
      adCode: adCode || undefined,
      ieCode,
      preCarriageBy: preCarriageBy || undefined,
      placeOfReceipt: placeOfReceipt || undefined,
      vesselFlightNo: vesselFlightNo || undefined,
      portOfLoading: portOfLoading || undefined,
      portOfDischarge: portOfDischarge || undefined,
      finalDestination: finalDestination || undefined,
      terms: terms || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Export Invoice"
        description="Create a commercial/proforma/customs invoice linked to an export order."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Invoices', href: '/export/invoices' },
          { label: 'New' },
        ]}
      />

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Order *</label>
            <select
              value={exportOrderId}
              onChange={(e) => {
                setExportOrderId(e.target.value);
                const o = orders.find((x) => x.id === e.target.value);
                if (o?.buyerId) setBuyerId(o.buyerId);
              }}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select order...</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber ?? o.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Type *</label>
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="COMMERCIAL">Commercial</option>
              <option value="PROFORMA">Proforma</option>
              <option value="CUSTOMS">Customs</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Buyer *</label>
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select buyer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Currency</label>
            <input
              type="text"
              maxLength={3}
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm uppercase"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Exchange Rate (to INR)</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={exchangeRateDecimal}
              onChange={(e) => setExchangeRateDecimal(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">IGST ({currencyCode})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={igstDecimal}
              onChange={(e) => setIgstDecimal(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">IE Code *</label>
            <input
              type="text"
              value={ieCode}
              onChange={(e) => setIeCode(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">AD Code</label>
            <input
              type="text"
              value={adCode}
              onChange={(e) => setAdCode(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">LUT Number</label>
            <input
              type="text"
              value={lutNumber}
              onChange={(e) => setLutNumber(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">LUT Date</label>
            <input
              type="date"
              value={lutDate}
              onChange={(e) => setLutDate(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Pre-Carriage By</label>
            <input
              type="text"
              value={preCarriageBy}
              onChange={(e) => setPreCarriageBy(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Place of Receipt</label>
            <input
              type="text"
              value={placeOfReceipt}
              onChange={(e) => setPlaceOfReceipt(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Vessel / Flight No.</label>
            <input
              type="text"
              value={vesselFlightNo}
              onChange={(e) => setVesselFlightNo(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Port of Loading</label>
            <input
              type="text"
              value={portOfLoading}
              onChange={(e) => setPortOfLoading(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Port of Discharge</label>
            <input
              type="text"
              value={portOfDischarge}
              onChange={(e) => setPortOfDischarge(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Final Destination</label>
            <input
              type="text"
              value={finalDestination}
              onChange={(e) => setFinalDestination(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Invoice Items *</label>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-[2fr_0.6fr_1fr_0.8fr_0.8fr_0.8fr_auto] gap-2 items-end border rounded-md p-3">
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <input
                  type="text"
                  value={it.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={it.unitPriceDecimal}
                  onChange={(e) => updateItem(idx, 'unitPriceDecimal', parseFloat(e.target.value) || 0)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">HS Code</label>
                <input
                  type="text"
                  value={it.hsCode}
                  onChange={(e) => updateItem(idx, 'hsCode', e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Gross (g)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={it.weightG}
                  onChange={(e) => updateItem(idx, 'weightG', parseFloat(e.target.value) || 0)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Net (g)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={it.netWeightG}
                  onChange={(e) => updateItem(idx, 'netWeightG', parseFloat(e.target.value) || 0)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Terms / Payment Terms</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending || !exportOrderId || !buyerId || !ieCode}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Export Invoice'}
          </button>
          {createMutation.isSuccess && <p className="text-sm text-green-600">Created.</p>}
        </div>
        {createMutation.isError && (
          <p className="text-sm text-destructive">{createMutation.error.message}</p>
        )}
      </form>
    </div>
  );
}
