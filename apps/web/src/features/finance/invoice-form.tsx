'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface InvoiceLine {
  productId: string;
  description: string;
  quantity: number;
  unitPricePaise: number;
  discountPaise: number;
  hsnCode: string;
  gstRate: number;
}

interface InvoiceFormProps {
  invoiceType: 'SALES' | 'PURCHASE';
  customers?: Array<{ id: string; firstName: string; lastName: string }>;
  suppliers?: Array<{ id: string; name: string }>;
  products?: Array<{ id: string; sku: string; name: string; sellingPricePaise: bigint | null }>;
  locations: Array<{ id: string; name: string; state?: string | null }>;
  onSubmit: (data: {
    invoiceType: string;
    customerId?: string;
    supplierId?: string;
    locationId: string;
    sourceState: string;
    destState: string;
    dueDate?: string;
    notes?: string;
    terms?: string;
    lineItems: InvoiceLine[];
  }) => void;
  isLoading?: boolean;
}

const DEFAULT_GST_RATE = 300; // 3% for jewelry (HSN 7113)

export function InvoiceForm({
  invoiceType,
  customers,
  suppliers,
  products,
  locations,
  onSubmit,
  isLoading,
}: InvoiceFormProps) {
  const [customerId, setCustomerId] = React.useState('');
  const [supplierId, setSupplierId] = React.useState('');
  const [locationId, setLocationId] = React.useState('');
  const [sourceState, setSourceState] = React.useState('MH');
  const [destState, setDestState] = React.useState('MH');
  const [dueDate, setDueDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [lines, setLines] = React.useState<InvoiceLine[]>([
    { productId: '', description: '', quantity: 1, unitPricePaise: 0, discountPaise: 0, hsnCode: '7113', gstRate: DEFAULT_GST_RATE },
  ]);

  const isSales = invoiceType === 'SALES';

  const addLine = () => {
    setLines([
      ...lines,
      { productId: '', description: '', quantity: 1, unitPricePaise: 0, discountPaise: 0, hsnCode: '7113', gstRate: DEFAULT_GST_RATE },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: string | number) => {
    setLines(lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const isInterState = sourceState.toUpperCase() !== destState.toUpperCase();

  const computeLineTax = (line: InvoiceLine) => {
    const lineTotal = line.unitPricePaise * line.quantity;
    const taxableAmount = lineTotal - line.discountPaise;
    const ratePercent = line.gstRate / 100;

    if (isInterState) {
      const igst = Math.round((taxableAmount * ratePercent) / 100);
      return { taxableAmount, cgst: 0, sgst: 0, igst, total: taxableAmount + igst };
    } else {
      const halfRate = ratePercent / 2;
      const cgst = Math.round((taxableAmount * halfRate) / 100);
      const sgst = Math.round((taxableAmount * halfRate) / 100);
      return { taxableAmount, cgst, sgst, igst: 0, total: taxableAmount + cgst + sgst };
    }
  };

  const totals = lines.reduce(
    (acc, line) => {
      const tax = computeLineTax(line);
      return {
        subtotal: acc.subtotal + line.unitPricePaise * line.quantity,
        discount: acc.discount + line.discountPaise,
        cgst: acc.cgst + tax.cgst,
        sgst: acc.sgst + tax.sgst,
        igst: acc.igst + tax.igst,
        total: acc.total + tax.total,
      };
    },
    { subtotal: 0, discount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );

  const formatAmount = (paise: number) => {
    return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      invoiceType,
      customerId: isSales ? customerId : undefined,
      supplierId: !isSales ? supplierId : undefined,
      locationId,
      sourceState,
      destState,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      lineItems: lines,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {isSales ? (
          <div>
            <label className="block text-sm font-medium text-foreground">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select customer</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-foreground">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select supplier</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground">Location</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Select location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-foreground">Source State</label>
          <input
            type="text"
            value={sourceState}
            onChange={(e) => setSourceState(e.target.value)}
            placeholder="e.g., MH"
            maxLength={5}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Destination State</label>
          <input
            type="text"
            value={destState}
            onChange={(e) => setDestState(e.target.value)}
            placeholder="e.g., MH"
            maxLength={5}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Unit Price</th>
              <th className="px-3 py-2 text-right font-medium">Discount</th>
              <th className="px-3 py-2 text-left font-medium">HSN</th>
              <th className="px-3 py-2 text-right font-medium">GST %</th>
              <th className="px-3 py-2 text-right font-medium">Tax</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const tax = computeLineTax(line);
              return (
                <tr key={index} className="border-b">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      placeholder="Item description"
                      className="w-full min-w-[200px] rounded border border-input bg-background px-2 py-1 text-sm"
                      required
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', parseInt(e.target.value || '1'))}
                      className="w-16 rounded border border-input bg-background px-2 py-1 text-right text-sm"
                      min="1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={line.unitPricePaise / 100 || ''}
                      onChange={(e) => updateLine(index, 'unitPricePaise', Math.round(parseFloat(e.target.value || '0') * 100))}
                      placeholder="0.00"
                      className="w-28 rounded border border-input bg-background px-2 py-1 text-right text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={line.discountPaise / 100 || ''}
                      onChange={(e) => updateLine(index, 'discountPaise', Math.round(parseFloat(e.target.value || '0') * 100))}
                      placeholder="0.00"
                      className="w-24 rounded border border-input bg-background px-2 py-1 text-right text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={line.hsnCode}
                      onChange={(e) => updateLine(index, 'hsnCode', e.target.value)}
                      className="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={line.gstRate / 100}
                      onChange={(e) => updateLine(index, 'gstRate', Math.round(parseFloat(e.target.value || '0') * 100))}
                      className="w-16 rounded border border-input bg-background px-2 py-1 text-right text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatAmount(tax.cgst + tax.sgst + tax.igst)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatAmount(tax.total)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={lines.length <= 1}
                      className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addLine}
        className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
      >
        <Plus className="h-4 w-4" /> Add Line Item
      </button>

      {/* Tax Summary */}
      <div className="flex justify-end">
        <div className="w-72 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatAmount(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount:</span>
              <span className="text-destructive">-{formatAmount(totals.discount)}</span>
            </div>
          )}
          {!isInterState ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CGST:</span>
                <span>{formatAmount(totals.cgst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SGST:</span>
                <span>{formatAmount(totals.sgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-muted-foreground">IGST:</span>
              <span>{formatAmount(totals.igst)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 text-base font-bold">
            <span>Total:</span>
            <span>{formatAmount(totals.total)}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || lines.every((l) => l.unitPricePaise === 0)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : `Create ${isSales ? 'Sales' : 'Purchase'} Invoice`}
        </button>
      </div>
    </form>
  );
}
