'use client';

import * as React from 'react';
import { Banknote, Smartphone, Building2, FileText } from 'lucide-react';
import { cn } from '@caratflow/ui';

type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  className?: string;
}

const methods: Array<{ value: PaymentMethod; label: string; icon: React.ElementType; description: string }> = [
  { value: 'CASH', label: 'Cash', icon: Banknote, description: 'Counter payment' },
  { value: 'UPI', label: 'UPI', icon: Smartphone, description: 'Google Pay, PhonePe, etc.' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2, description: 'NEFT/RTGS/IMPS' },
  { value: 'CHEQUE', label: 'Cheque', icon: FileText, description: 'Bank cheque' },
];

export function PaymentMethodSelector({ value, onChange, className }: PaymentMethodSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      {methods.map((method) => {
        const isSelected = value === method.value;
        const Icon = method.icon;
        return (
          <button
            key={method.value}
            type="button"
            onClick={() => onChange(method.value)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors',
              isSelected
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/50',
            )}
          >
            <Icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
            <span className="text-sm font-medium">{method.label}</span>
            <span className="text-xs">{method.description}</span>
          </button>
        );
      })}
    </div>
  );
}
