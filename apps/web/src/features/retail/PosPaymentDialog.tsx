'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@caratflow/ui';
import {
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  FileText,
  Coins,
  Gift,
  Star,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@caratflow/ui';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
  { value: 'CHEQUE', label: 'Cheque', icon: FileText },
  { value: 'OLD_GOLD', label: 'Old Gold', icon: Coins },
  { value: 'GIFT_CARD', label: 'Gift Card', icon: Gift },
  { value: 'LOYALTY_POINTS', label: 'Loyalty Points', icon: Star },
] as const;

interface PaymentEntry {
  id: string;
  method: string;
  amountPaise: number;
  reference: string;
}

interface PosPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalPaise: number;
  onConfirm: (payments: Array<{ method: string; amountPaise: number; reference?: string }>) => void;
  isProcessing?: boolean;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PosPaymentDialog({
  open,
  onOpenChange,
  totalPaise,
  onConfirm,
  isProcessing = false,
}: PosPaymentDialogProps) {
  const [payments, setPayments] = React.useState<PaymentEntry[]>([
    { id: '1', method: 'CASH', amountPaise: totalPaise, reference: '' },
  ]);

  React.useEffect(() => {
    if (open) {
      setPayments([{ id: '1', method: 'CASH', amountPaise: totalPaise, reference: '' }]);
    }
  }, [open, totalPaise]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaise, 0);
  const remaining = totalPaise - totalPaid;

  const addPayment = () => {
    setPayments((prev) => [
      ...prev,
      { id: String(Date.now()), method: 'CASH', amountPaise: Math.max(0, remaining), reference: '' },
    ]);
  };

  const removePayment = (id: string) => {
    if (payments.length <= 1) return;
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePayment = (id: string, field: keyof PaymentEntry, value: string | number) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const handleConfirm = () => {
    const validPayments = payments
      .filter((p) => p.amountPaise > 0)
      .map((p) => ({
        method: p.method,
        amountPaise: p.amountPaise,
        reference: p.reference || undefined,
      }));
    onConfirm(validPayments);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total due */}
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Due</p>
            <p className="text-3xl font-bold">{formatPaise(totalPaise)}</p>
          </div>

          {/* Payment entries */}
          <div className="space-y-3">
            {payments.map((payment, index) => (
              <div key={payment.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Payment {index + 1}
                  </span>
                  {payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePayment(payment.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Method selector */}
                <div className="grid grid-cols-4 gap-1">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => updatePayment(payment.id, 'method', method.value)}
                        className={cn(
                          'flex flex-col items-center gap-0.5 rounded-md border p-1.5 text-[10px] transition-colors',
                          payment.method === method.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'hover:bg-accent',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {method.label}
                      </button>
                    );
                  })}
                </div>

                {/* Amount */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={payment.amountPaise / 100 || ''}
                    onChange={(e) => updatePayment(payment.id, 'amountPaise', Math.round(parseFloat(e.target.value || '0') * 100))}
                    className="h-9 flex-1 rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {payment.method !== 'CASH' && (
                    <input
                      type="text"
                      placeholder="Reference / Txn ID"
                      value={payment.reference}
                      onChange={(e) => updatePayment(payment.id, 'reference', e.target.value)}
                      className="h-9 flex-1 rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add split payment */}
          <button
            type="button"
            onClick={addPayment}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            Split Payment
          </button>

          {/* Balance info */}
          {remaining !== 0 && (
            <div
              className={cn(
                'rounded-md p-2 text-center text-sm font-medium',
                remaining > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
              )}
            >
              {remaining > 0
                ? `Remaining: ${formatPaise(remaining)}`
                : `Change: ${formatPaise(Math.abs(remaining))}`}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={remaining > 0 || isProcessing || payments.every((p) => p.amountPaise <= 0)}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Complete Sale'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
