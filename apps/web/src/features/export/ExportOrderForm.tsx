'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { IncotermsSelector } from './IncotermsSelector';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPricePaise: number;
  hsCode: string;
  weightMg: number;
  metalPurity: number;
  countryOfOrigin: string;
}

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function ExportOrderForm() {
  const [buyerId, setBuyerId] = useState('');
  const [buyerCountry, setBuyerCountry] = useState('');
  const [locationId, setLocationId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('83.0000');
  const [incoterms, setIncoterms] = useState('FOB');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [expectedShipDate, setExpectedShipDate] = useState('');
  const [shippingPaise, setShippingPaise] = useState(0);
  const [insurancePaise, setInsurancePaise] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPricePaise: 0, hsCode: '7113.19', weightMg: 0, metalPurity: 916, countryOfOrigin: 'IN' },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      { id: String(Date.now()), description: '', quantity: 1, unitPricePaise: 0, hsCode: '7113.19', weightMg: 0, metalPurity: 916, countryOfOrigin: 'IN' },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const subtotal = items.reduce((sum, i) => sum + i.unitPricePaise * i.quantity, 0);
  const total = subtotal + shippingPaise + insurancePaise;

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold">New Export Order</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Buyer *</label>
          <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">Select buyer...</option>
            <option value="b1">Diamond Corp USA</option>
            <option value="b2">Al Maktoum Jewels</option>
            <option value="b3">London Gold Ltd</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Buyer Country *</label>
          <select value={buyerCountry} onChange={(e) => setBuyerCountry(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">Select country...</option>
            <option value="US">United States</option>
            <option value="AE">UAE</option>
            <option value="GB">United Kingdom</option>
            <option value="SG">Singapore</option>
            <option value="HK">Hong Kong</option>
            <option value="JP">Japan</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Ship From Location *</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">Select location...</option>
            <option value="l1">Main Warehouse</option>
            <option value="l2">SEZ Unit</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Currency *</label>
          <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="AED">AED - UAE Dirham</option>
            <option value="SGD">SGD - Singapore Dollar</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Exchange Rate (1 {currencyCode} = INR) *</label>
          <input type="number" step="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
        <IncotermsSelector value={incoterms} onChange={setIncoterms} />
        <div>
          <label className="text-sm font-medium">Payment Terms *</label>
          <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">Select terms...</option>
            <option value="LC 30 days">LC 30 days</option>
            <option value="LC 60 days">LC 60 days</option>
            <option value="LC 90 days">LC 90 days</option>
            <option value="Advance Payment">Advance Payment</option>
            <option value="TT 30 days">TT 30 days</option>
            <option value="DA 60 days">DA 60 days</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Expected Ship Date</label>
          <input type="date" value={expectedShipDate} onChange={(e) => setExpectedShipDate(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Notes</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Export Items</label>
          <button onClick={addItem} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3 w-3" /> Add Item
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-end">
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">Description</label>}
                <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="Item description" className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">HS Code</label>}
                <input type="text" value={item.hsCode} onChange={(e) => updateItem(item.id, 'hsCode', e.target.value)} placeholder="7113.19" className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono" />
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">Qty</label>}
                <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">Unit Price (Rs)</label>}
                <input type="number" min="0" step="0.01" value={item.unitPricePaise / 100} onChange={(e) => updateItem(item.id, 'unitPricePaise', Math.round(parseFloat(e.target.value) * 100) || 0)} className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">Weight (g)</label>}
                <input type="number" min="0" step="0.001" value={item.weightMg / 1000} onChange={(e) => updateItem(item.id, 'weightMg', Math.round(parseFloat(e.target.value) * 1000) || 0)} className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">Purity</label>}
                <select value={item.metalPurity} onChange={(e) => updateItem(item.id, 'metalPurity', parseInt(e.target.value))} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                  <option value={999}>24K</option>
                  <option value={916}>22K</option>
                  <option value={750}>18K</option>
                  <option value={585}>14K</option>
                </select>
              </div>
              <div>
                {idx === 0 && <label className="text-xs text-muted-foreground">&nbsp;</label>}
                <button onClick={() => removeItem(item.id)} className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50" disabled={items.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charges */}
      <div className="grid gap-4 sm:grid-cols-2 pt-2">
        <div>
          <label className="text-sm font-medium">Shipping Charges (Rs)</label>
          <input type="number" min="0" step="0.01" value={shippingPaise / 100} onChange={(e) => setShippingPaise(Math.round(parseFloat(e.target.value) * 100) || 0)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Insurance Charges (Rs)</label>
          <input type="number" min="0" step="0.01" value={insurancePaise / 100} onChange={(e) => setInsurancePaise(Math.round(parseFloat(e.target.value) * 100) || 0)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-end border-t pt-4">
        <div className="text-right space-y-1">
          <div className="flex justify-between gap-8 text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatPaise(subtotal)}</span></div>
          <div className="flex justify-between gap-8 text-sm"><span className="text-muted-foreground">Shipping</span><span>{formatPaise(shippingPaise)}</span></div>
          <div className="flex justify-between gap-8 text-sm"><span className="text-muted-foreground">Insurance</span><span>{formatPaise(insurancePaise)}</span></div>
          <div className="flex justify-between gap-8 border-t pt-1"><span className="font-semibold">Total</span><span className="text-lg font-bold">{formatPaise(total)}</span></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <a href="/export/orders" className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-accent inline-flex items-center">Cancel</a>
        <button disabled={!buyerId || !buyerCountry || !locationId || items.some((i) => !i.description)} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
          Create Export Order
        </button>
      </div>
    </div>
  );
}
