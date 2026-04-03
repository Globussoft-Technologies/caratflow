'use client';

import { StatusBadge } from '@caratflow/ui';
import { User, Phone, Mail, MapPin, Gift } from 'lucide-react';

interface Customer360CardProps {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
    customerType: string;
    loyaltyPoints: number;
    loyaltyTier: string | null;
  };
  onClick?: () => void;
}

export function Customer360Card({ customer, onClick }: Customer360CardProps) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{customer.firstName} {customer.lastName}</h4>
            <StatusBadge label={customer.customerType} variant="info" dot={false} />
          </div>
          <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            {customer.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {customer.phone}
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3" /> {customer.email}
              </div>
            )}
            {customer.city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {customer.city}, {customer.state}
              </div>
            )}
          </div>
          {customer.loyaltyPoints > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              <Gift className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium">{customer.loyaltyPoints.toLocaleString('en-IN')} pts</span>
              {customer.loyaltyTier && (
                <StatusBadge label={customer.loyaltyTier} variant="warning" dot={false} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
