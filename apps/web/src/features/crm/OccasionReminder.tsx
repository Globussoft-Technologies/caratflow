'use client';

import { StatusBadge } from '@caratflow/ui';
import { CalendarDays, Gift, Heart, Star } from 'lucide-react';
import Link from 'next/link';

interface Occasion {
  id: string;
  customerId: string;
  customerName: string;
  occasionType: string;
  date: Date;
  daysAway: number;
}

interface OccasionReminderProps {
  occasions: Occasion[];
  maxItems?: number;
}

const occasionIcons: Record<string, React.ReactNode> = {
  BIRTHDAY: <Gift className="h-4 w-4 text-amber-500" />,
  ANNIVERSARY: <Heart className="h-4 w-4 text-rose-500" />,
  WEDDING: <Heart className="h-4 w-4 text-rose-500" />,
  ENGAGEMENT: <Star className="h-4 w-4 text-violet-500" />,
  FESTIVAL: <Star className="h-4 w-4 text-orange-500" />,
  OTHER: <CalendarDays className="h-4 w-4 text-blue-500" />,
};

export function OccasionReminder({ occasions, maxItems = 5 }: OccasionReminderProps) {
  const displayed = occasions.slice(0, maxItems);

  return (
    <div className="space-y-3">
      {displayed.map((occ) => (
        <div key={occ.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              {occasionIcons[occ.occasionType] ?? occasionIcons.OTHER}
            </div>
            <div>
              <Link
                href={`/crm/customers/${occ.customerId}`}
                className="text-sm font-medium hover:underline"
              >
                {occ.customerName}
              </Link>
              <p className="text-xs text-muted-foreground">
                {occ.occasionType.replace('_', ' ')} -- {occ.date.toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
          <StatusBadge
            label={occ.daysAway === 0 ? 'Today' : occ.daysAway === 1 ? 'Tomorrow' : `${occ.daysAway} days`}
            variant={occ.daysAway <= 1 ? 'danger' : occ.daysAway <= 3 ? 'warning' : 'info'}
          />
        </div>
      ))}
      {occasions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No upcoming occasions.
        </p>
      )}
    </div>
  );
}
