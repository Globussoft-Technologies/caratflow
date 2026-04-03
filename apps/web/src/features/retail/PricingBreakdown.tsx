'use client';

import { cn } from '@caratflow/ui';

interface PricingBreakdownProps {
  metalValuePaise: number;
  makingChargesPaise: number;
  wastageChargesPaise: number;
  discountPaise?: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  className?: string;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PricingBreakdown({
  metalValuePaise,
  makingChargesPaise,
  wastageChargesPaise,
  discountPaise = 0,
  cgstPaise,
  sgstPaise,
  igstPaise,
  totalPaise,
  className,
}: PricingBreakdownProps) {
  const subtotal = metalValuePaise + makingChargesPaise + wastageChargesPaise;
  const totalTax = cgstPaise + sgstPaise + igstPaise;

  return (
    <div className={cn('space-y-1 text-sm', className)}>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Metal Value</span>
        <span>{formatPaise(metalValuePaise)}</span>
      </div>
      {makingChargesPaise > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Making Charges</span>
          <span>{formatPaise(makingChargesPaise)}</span>
        </div>
      )}
      {wastageChargesPaise > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Wastage Charges</span>
          <span>{formatPaise(wastageChargesPaise)}</span>
        </div>
      )}
      <div className="border-t pt-1">
        <div className="flex justify-between font-medium">
          <span>Subtotal</span>
          <span>{formatPaise(subtotal)}</span>
        </div>
      </div>
      {discountPaise > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>Discount</span>
          <span>-{formatPaise(discountPaise)}</span>
        </div>
      )}
      {cgstPaise > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>CGST (1.5%)</span>
          <span>{formatPaise(cgstPaise)}</span>
        </div>
      )}
      {sgstPaise > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>SGST (1.5%)</span>
          <span>{formatPaise(sgstPaise)}</span>
        </div>
      )}
      {igstPaise > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>IGST (3%)</span>
          <span>{formatPaise(igstPaise)}</span>
        </div>
      )}
      {totalTax > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Total Tax</span>
          <span>{formatPaise(totalTax)}</span>
        </div>
      )}
      <div className="border-t pt-1">
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatPaise(totalPaise)}</span>
        </div>
      </div>
    </div>
  );
}
