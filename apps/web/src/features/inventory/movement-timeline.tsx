'use client';

import { ArrowDown, ArrowUp, ArrowLeftRight, RotateCcw, Wrench, Factory } from 'lucide-react';

interface Movement {
  id: string;
  movementType: string;
  quantityChange: number;
  movedAt: string;
  notes: string | null;
  referenceType: string | null;
}

interface MovementTimelineProps {
  movements: Movement[];
}

const typeIcons: Record<string, React.ReactNode> = {
  IN: <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />,
  OUT: <ArrowUp className="h-3.5 w-3.5 text-red-600" />,
  TRANSFER: <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />,
  ADJUST: <Wrench className="h-3.5 w-3.5 text-amber-600" />,
  RETURN: <RotateCcw className="h-3.5 w-3.5 text-purple-600" />,
  PRODUCTION: <Factory className="h-3.5 w-3.5 text-teal-600" />,
};

const typeLabels: Record<string, string> = {
  IN: 'Stock In',
  OUT: 'Stock Out',
  TRANSFER: 'Transfer',
  ADJUST: 'Adjustment',
  RETURN: 'Return',
  PRODUCTION: 'Production',
};

export function MovementTimeline({ movements }: MovementTimelineProps) {
  if (movements.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-6">
        No movements recorded yet.
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

      {movements.map((movement, index) => (
        <div key={movement.id} className="relative flex gap-4 py-2">
          {/* Icon circle */}
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
            {typeIcons[movement.movementType] ?? <Wrench className="h-3.5 w-3.5" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {typeLabels[movement.movementType] ?? movement.movementType}
              </span>
              <span
                className={`text-sm font-semibold ${
                  movement.quantityChange > 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}
              </span>
              {movement.referenceType && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {movement.referenceType}
                </span>
              )}
            </div>
            {movement.notes && (
              <p className="text-xs text-muted-foreground mt-0.5">{movement.notes}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(movement.movedAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
