'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { Plus, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

type Incoterm = 'FOB' | 'CIF' | 'EXW' | 'DDP';

interface LineItem {
  description: string;
  quantity: number;
  unitPriceDecimal: number;
  hsCode: string;
  weightG: number;
  productId?: string;
}

export default function NewExportOrderPage() {
  const router = useRouter();

  const [buyerId, setBuyerId] = useState('');
  const [buyerCountry, setBuyerCountry] = useState('US');
  const [locationId, setLocationId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [exchangeRateDecimal, setExchangeRateDecimal] = useState<number>(83.5);
  const [incoterms, setIncoterms] = useState<Incoterm>('FOB');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [shippingDecimal, setShippingDecimal] = useState<number>(0);
  const [insuranceDecimal, setInsuranceDecimal] = useState<number>(0);
  const [expectedShipDate, setExpectedShipDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPriceDecimal: 0, hsCode: '7113', weightG: 0 },
  ]);

  const customersQuery = trpc.crm.customerList.useQuery({
    page: 1,
    limit: 100,
    sortOrder: 'desc',
  });
  const branchesQuery = trpc.platform.branches.list.useQuery({ includeInactive: false });

  const createMutation = trpc.export.createOrder.useMutation({
    onSuccess: (result: unknown) => {
      const id = (result as { id?: string } | null)?.id;
      router.push(id ? `/export/orders/${id}` : '/export/orders');
    },
  });

  const customers = ((customersQuery.data as { data?: Array<{ id: string; firstName?: string; lastName?: string }> } | undefined)?.data) ?? [];
  const branches = (branchesQuery.data as Array<{ id: string; name: string }> | undefined) ?? [];

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unitPriceDecimal: 0, hsCode: '7113', weightG: 0 },
    ]);

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const updateItem = <K extends keyof LineItem>(i: number, field: K, value: LineItem[K]) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      buyerId,
      buyerCountry: buyerCountry.toUpperCase(),
      locationId,
      currencyCode: currencyCode.toUpperCase(),
      exchangeRate: Math.round(exchangeRateDecimal * 10000),
      incoterms: incoterms as never,
      paymentTerms,
      items: items.map((it) => ({
        productId: it.productId || undefined,
        description: it.description,
        quantity: it.quantity,
        unitPricePaise: Math.round(it.unitPriceDecimal * 100),
        hsCode: it.hsCode,
        weightMg: Math.round(it.weightG * 1000),
        countryOfOrigin: 'IN',
      })),
      shippingPaise: Math.round(shippingDecimal * 100),
      insurancePaise: Math.round(insuranceDecimal * 100),
      expectedShipDate: expectedShipDate ? new Date(expectedShipDate) : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Export Order"
        description="Create an international shipment with buyer, line items, and incoterms."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Orders', href: '/export/orders' },
          { label: 'New' },
        ]}
      />

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Buyer (Customer) *</label>
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
            <label className="text-sm font-medium">Destination Country (ISO-2) *</label>
            <input
              type="text"
              maxLength={2}
              value={buyerCountry}
              onChange={(e) => setBuyerCountry(e.target.value.toUpperCase())}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm uppercase"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Location (Ship From) *</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select location...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Incoterms</label>
            <select
              value={incoterms}
              onChange={(e) => setIncoterms(e.target.value as Incoterm)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="FOB">FOB - Free On Board</option>
              <option value="CIF">CIF - Cost, Insurance, Freight</option>
              <option value="EXW">EXW - Ex Works</option>
              <option value="DDP">DDP - Delivered Duty Paid</option>
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
            <label className="text-sm font-medium">Payment Terms</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Expected Ship Date</label>
            <input
              type="date"
              value={expectedShipDate}
              onChange={(e) => setExpectedShipDate(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Shipping ({currencyCode})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={shippingDecimal}
              onChange={(e) => setShippingDecimal(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Insurance ({currencyCode})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={insuranceDecimal}
              onChange={(e) => setInsuranceDecimal(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Line Items *</label>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-[2fr_0.6fr_1fr_0.8fr_0.8fr_auto] gap-2 items-end border rounded-md p-3">
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
                <label className="text-xs text-muted-foreground">Weight (g)</label>
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
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending || !buyerId || !locationId}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Export Order'}
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
