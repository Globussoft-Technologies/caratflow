'use client';

import * as React from 'react';
import { Trash2, Minus, Plus } from 'lucide-react';
import { cn } from '@caratflow/ui';

export interface CartItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPricePaise: number;
  metalWeightMg: number;
  metalRatePaise: number;
  makingChargesPaise: number;
  wastageChargesPaise: number;
  discountPaise: number;
  hsnCode: string;
  gstRate: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  lineTotalPaise: number;
}

interface PosCartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  className?: string;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PosCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  subtotalPaise,
  discountPaise,
  taxPaise,
  totalPaise,
  className,
}: PosCartProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">Cart</h2>
        <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No items in cart
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.description}</p>
                    <div className="mt-0.5 text-xs text-muted-foreground space-y-0.5">
                      {item.metalWeightMg > 0 && (
                        <p>
                          {(item.metalWeightMg / 1000).toFixed(3)}g @ {formatPaise(item.metalRatePaise)}/g
                        </p>
                      )}
                      {item.makingChargesPaise > 0 && (
                        <p>Making: {formatPaise(item.makingChargesPaise)}</p>
                      )}
                      <p className="text-[10px]">
                        Tax: {formatPaise(item.cgstPaise + item.sgstPaise + item.igstPaise)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatPaise(item.lineTotalPaise)}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border text-xs hover:bg-accent"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border text-xs hover:bg-accent"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Totals */}
      <div className="border-t bg-muted/30 px-4 py-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPaise(subtotalPaise)}</span>
        </div>
        {discountPaise > 0 && (
          <div className="flex justify-between text-sm text-emerald-600">
            <span>Discount</span>
            <span>-{formatPaise(discountPaise)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax (GST)</span>
          <span>{formatPaise(taxPaise)}</span>
        </div>
        <div className="flex justify-between border-t pt-1 text-lg font-bold">
          <span>Total</span>
          <span>{formatPaise(totalPaise)}</span>
        </div>
      </div>
    </div>
  );
}
