'use client';

import * as React from 'react';

interface TaxBreakdownProps {
  taxableAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  cessPaise?: number;
  cgstRate?: number; // percent * 100
  sgstRate?: number;
  igstRate?: number;
  isInterState: boolean;
  currencyCode?: string;
}

export function TaxBreakdownDisplay({
  taxableAmountPaise,
  cgstPaise,
  sgstPaise,
  igstPaise,
  cessPaise = 0,
  cgstRate,
  sgstRate,
  igstRate,
  isInterState,
  currencyCode = 'INR',
}: TaxBreakdownProps) {
  const formatAmount = (paise: number) => {
    return (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatRate = (rate?: number) => {
    if (!rate) return '';
    return `(${(rate / 100).toFixed(1)}%)`;
  };

  const totalTax = cgstPaise + sgstPaise + igstPaise + cessPaise;

  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <h4 className="mb-3 text-sm font-semibold text-foreground">Tax Breakdown</h4>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Taxable Amount:</span>
          <span className="font-medium">{formatAmount(taxableAmountPaise)}</span>
        </div>
        {isInterState ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">IGST {formatRate(igstRate)}:</span>
            <span className="font-medium">{formatAmount(igstPaise)}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CGST {formatRate(cgstRate)}:</span>
              <span className="font-medium">{formatAmount(cgstPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SGST {formatRate(sgstRate)}:</span>
              <span className="font-medium">{formatAmount(sgstPaise)}</span>
            </div>
          </>
        )}
        {cessPaise > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cess:</span>
            <span className="font-medium">{formatAmount(cessPaise)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-1.5 font-semibold">
          <span>Total Tax:</span>
          <span>{formatAmount(totalTax)}</span>
        </div>
        <div className="flex justify-between border-t pt-1.5 text-base font-bold">
          <span>Grand Total:</span>
          <span>{formatAmount(taxableAmountPaise + totalTax)}</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {isInterState ? 'Inter-state supply (IGST applicable)' : 'Intra-state supply (CGST + SGST applicable)'}
      </div>
    </div>
  );
}
