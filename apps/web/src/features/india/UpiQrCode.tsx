'use client';

import * as React from 'react';
import { Smartphone, Copy, CheckCircle2 } from 'lucide-react';

interface UpiQrCodeProps {
  upiUrl: string;
  payeeVpa: string;
  payeeName: string;
  amountRupees: string;
  transactionNote: string;
  referenceId: string;
  className?: string;
}

export function UpiQrCode({
  upiUrl,
  payeeVpa,
  payeeName,
  amountRupees,
  transactionNote,
  referenceId,
  className,
}: UpiQrCodeProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(upiUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  return (
    <div className={`rounded-lg border bg-card p-6 ${className ?? ''}`}>
      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Smartphone className="h-4 w-4 text-purple-600" /> UPI Payment
      </h4>

      {/* QR Code Placeholder */}
      <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
        <div className="text-center">
          <Smartphone className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">QR Code</p>
          <p className="text-xs text-muted-foreground">(render with qrcode library)</p>
        </div>
      </div>

      {/* Payment Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payee</span>
          <span className="font-medium">{payeeName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">VPA</span>
          <span className="font-mono">{payeeVpa}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-mono font-semibold">{amountRupees}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Note</span>
          <span className="text-right">{transactionNote}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reference</span>
          <span className="font-mono text-xs">{referenceId}</span>
        </div>
      </div>

      {/* Copy UPI Link */}
      <button
        onClick={handleCopy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        {copied ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" /> Copy UPI Link
          </>
        )}
      </button>
    </div>
  );
}
