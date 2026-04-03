'use client';

import * as React from 'react';
import { cn } from '@caratflow/ui';

interface SaleInvoiceProps {
  saleNumber: string;
  date: Date;
  customerName?: string | null;
  customerPhone?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPricePaise: number;
    metalWeightMg: number;
    makingChargesPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    lineTotalPaise: number;
    hsnCode: string;
  }>;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  roundOffPaise: number;
  totalPaise: number;
  payments: Array<{
    method: string;
    amountPaise: number;
    reference?: string | null;
  }>;
  className?: string;
}

function formatPaise(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SaleInvoice({
  saleNumber,
  date,
  customerName,
  customerPhone,
  items,
  subtotalPaise,
  discountPaise,
  taxPaise,
  roundOffPaise,
  totalPaise,
  payments,
  className,
}: SaleInvoiceProps) {
  return (
    <div className={cn('mx-auto max-w-2xl bg-white p-8 text-black print:p-4', className)}>
      {/* Header */}
      <div className="text-center border-b pb-4">
        <h1 className="text-xl font-bold">TAX INVOICE</h1>
        <p className="text-sm text-gray-600 mt-1">Invoice No: {saleNumber}</p>
        <p className="text-sm text-gray-600">
          Date: {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Customer */}
      {(customerName || customerPhone) && (
        <div className="mt-4 text-sm">
          <p className="font-medium">Bill To:</p>
          {customerName && <p>{customerName}</p>}
          {customerPhone && <p>Phone: {customerPhone}</p>}
        </div>
      )}

      {/* Items Table */}
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 font-medium">#</th>
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 font-medium text-right">Wt (g)</th>
            <th className="py-2 font-medium text-right">Qty</th>
            <th className="py-2 font-medium text-right">HSN</th>
            <th className="py-2 font-medium text-right">Tax</th>
            <th className="py-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b">
              <td className="py-2">{i + 1}</td>
              <td className="py-2">
                <div>{item.description}</div>
                {item.makingChargesPaise > 0 && (
                  <div className="text-xs text-gray-500">
                    Making: ₹{formatPaise(item.makingChargesPaise)}
                  </div>
                )}
              </td>
              <td className="py-2 text-right">
                {item.metalWeightMg > 0 ? (item.metalWeightMg / 1000).toFixed(3) : '-'}
              </td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{item.hsnCode}</td>
              <td className="py-2 text-right">
                ₹{formatPaise(item.cgstPaise + item.sgstPaise + item.igstPaise)}
              </td>
              <td className="py-2 text-right font-medium">
                ₹{formatPaise(item.lineTotalPaise)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{formatPaise(subtotalPaise)}</span>
          </div>
          {discountPaise > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-₹{formatPaise(discountPaise)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax (GST)</span>
            <span>₹{formatPaise(taxPaise)}</span>
          </div>
          {roundOffPaise !== 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Round Off</span>
              <span>{roundOffPaise >= 0 ? '+' : ''}₹{formatPaise(roundOffPaise)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 text-base font-bold">
            <span>Grand Total</span>
            <span>₹{formatPaise(totalPaise)}</span>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="mt-6 border-t pt-3">
        <p className="text-sm font-medium">Payment Details:</p>
        <div className="mt-1 space-y-0.5 text-sm">
          {payments.map((p, i) => (
            <div key={i} className="flex justify-between">
              <span>{p.method}{p.reference ? ` (Ref: ${p.reference})` : ''}</span>
              <span>₹{formatPaise(p.amountPaise)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>Thank you for your purchase!</p>
        <p>Goods once sold will not be taken back. Exchange within 7 days with bill.</p>
      </div>
    </div>
  );
}
