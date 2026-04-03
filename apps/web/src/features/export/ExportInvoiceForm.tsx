'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ShippingDetailsForm } from './ShippingDetailsForm';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPricePaise: number;
  hsCode: string;
  weightMg: number;
  netWeightMg: number;
  countryOfOrigin: string;
}

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function ExportInvoiceForm() {
  const [invoiceType, setInvoiceType] = useState('COMMERCIAL');
  const [exportOrderId, setExportOrderId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('83.0000');
  const [ieCode, setIeCode] = useState('');
  const [adCode, setAdCode] = useState('');
  const [useLut, setUseLut] = useState(true);
  const [lutNumber, setLutNumber] = useState('');
  const [lutDate, setLutDate] = useState('');
  const [igstPaise, setIgstPaise] = useState(0);
  const [terms, setTerms] = useState('');

  // Shipping details
  const [preCarriageBy, setPreCarriageBy] = useState('');
  const [placeOfReceipt, setPlaceOfReceipt] = useState('');
  const [vesselFlightNo, setVesselFlightNo] = useState('');
  const [portOfLoading, setPortOfLoading] = useState('');
  const [portOfDischarge, setPortOfDischarge] = useState('');
  const [finalDestination, setFinalDestination] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPricePaise: 0, hsCode: '7113.19', weightMg: 0, netWeightMg: 0, countryOfOrigin: 'IN' },
  ]);

  const addItem = () => {
    setItems([...items, { id: String(Date.now()), description: '', quantity: 1, unitPricePaise: 0, hsCode: '7113.19', weightMg: 0, netWeightMg: 0, countryOfOrigin: 'IN' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const subtotal = items.reduce((sum, i) => sum + i.unitPricePaise * i.quantity, 0);
  const total = subtotal + (useLut ? 0 : igstPaise);

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold">New Export Invoice</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Invoice Type *</label>
          <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="COMMERCIAL">Commercial Invoice</option>
            <option value="PROFORMA">Proforma Invoice</option>
            <option value="CUSTOMS">Customs Invoice</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Export Order *</label>
          <select value={exportOrderId} onChange={(e) => setExportOrderId(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">Select order...</option>
            <option value="o1">EXP/CF/2604/0008</option>
            <option value="o2">EXP/CF/2604/0007</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Buyer *</label>
          <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">Select buyer...</option>
            <option value="b1">Diamond Corp USA</option>
            <option value="b2">Al Maktoum Jewels</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">IE Code *</label>
          <input type="text" value={ieCode} onChange={(e) => setIeCode(e.target.value)} placeholder="AABCD1234E" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-mono" />
        </div>
        <div>
          <label className="text-sm font-medium">AD Code</label>
          <input type="text" value={adCode} onChange={(e) => setAdCode(e.target.value)} placeholder="AD-0012345" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-mono" />
        </div>
        <div>
          <label className="text-sm font-medium">Currency</label>
          <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="AED">AED</option>
          </select>
        </div>
      </div>

      {/* LUT / IGST Toggle */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={useLut} onChange={() => setUseLut(true)} className="accent-primary" />
            Zero-rated IGST (with LUT)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={!useLut} onChange={() => setUseLut(false)} className="accent-primary" />
            IGST with payment
          </label>
        </div>
        {useLut ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">LUT Number *</label>
              <input type="text" value={lutNumber} onChange={(e) => setLutNumber(e.target.value)} placeholder="LUT-2025-001" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium">LUT Date</label>
              <input type="date" value={lutDate} onChange={(e) => setLutDate(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
            </div>
          </div>
        ) : (
          <div className="max-w-xs">
            <label className="text-sm font-medium">IGST Amount (Rs)</label>
            <input type="number" min="0" step="0.01" value={igstPaise / 100} onChange={(e) => setIgstPaise(Math.round(parseFloat(e.target.value) * 100) || 0)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
          </div>
        )}
      </div>

      {/* Shipping Details */}
      <ShippingDetailsForm
        preCarriageBy={preCarriageBy} onPreCarriageByChange={setPreCarriageBy}
        placeOfReceipt={placeOfReceipt} onPlaceOfReceiptChange={setPlaceOfReceipt}
        vesselFlightNo={vesselFlightNo} onVesselFlightNoChange={setVesselFlightNo}
        portOfLoading={portOfLoading} onPortOfLoadingChange={setPortOfLoading}
        portOfDischarge={portOfDischarge} onPortOfDischargeChange={setPortOfDischarge}
        finalDestination={finalDestination} onFinalDestinationChange={setFinalDestination}
      />

      {/* Items */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Invoice Items</label>
          <button onClick={addItem} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" /> Add Item</button>
        </div>
        {items.map((item, idx) => (
          <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-end">
            <div>
              {idx === 0 && <label className="text-xs text-muted-foreground">Description</label>}
              <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
            </div>
            <div>
              {idx === 0 && <label className="text-xs text-muted-foreground">HS Code</label>}
              <input type="text" value={item.hsCode} onChange={(e) => updateItem(item.id, 'hsCode', e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono" />
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
              {idx === 0 && <label className="text-xs text-muted-foreground">Net Wt (g)</label>}
              <input type="number" min="0" step="0.001" value={item.netWeightMg / 1000} onChange={(e) => updateItem(item.id, 'netWeightMg', Math.round(parseFloat(e.target.value) * 1000) || 0)} className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
            </div>
            <div>
              {idx === 0 && <label className="text-xs text-muted-foreground">&nbsp;</label>}
              <button onClick={() => removeItem(item.id)} className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500" disabled={items.length === 1}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="flex justify-end border-t pt-4">
        <div className="text-right space-y-1">
          <div className="flex justify-between gap-8 text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatPaise(subtotal)}</span></div>
          <div className="flex justify-between gap-8 text-sm"><span className="text-muted-foreground">IGST</span><span>{useLut ? 'Zero-rated (LUT)' : formatPaise(igstPaise)}</span></div>
          <div className="flex justify-between gap-8 border-t pt-1"><span className="font-semibold">Total</span><span className="text-lg font-bold">{formatPaise(total)}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <a href="/export/invoices" className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-accent inline-flex items-center">Cancel</a>
        <button disabled={!exportOrderId || !buyerId || !ieCode} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
          Create Invoice
        </button>
      </div>
    </div>
  );
}
