'use client';

interface CreditLimitCardProps {
  entityType: string;
  entityName: string;
  creditLimitPaise: number;
  usedPaise: number;
  availablePaise: number;
}

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `\u20B9${(rupees / 1000).toFixed(1)}K`;
  return `\u20B9${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export function CreditLimitCard({
  entityType,
  entityName,
  creditLimitPaise,
  usedPaise,
  availablePaise,
}: CreditLimitCardProps) {
  const usagePercent = creditLimitPaise > 0 ? (usedPaise / creditLimitPaise) * 100 : 0;
  const isHighUsage = usagePercent > 80;
  const isCritical = usagePercent > 95;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{entityName}</p>
          <p className="text-xs text-muted-foreground capitalize">{entityType.toLowerCase()}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            isCritical
              ? 'bg-red-100 text-red-700'
              : isHighUsage
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
          }`}
        >
          {usagePercent.toFixed(0)}% used
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            isCritical ? 'bg-red-500' : isHighUsage ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Limit</p>
          <p className="text-sm font-medium">{formatPaise(creditLimitPaise)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Used</p>
          <p className="text-sm font-medium">{formatPaise(usedPaise)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Available</p>
          <p className={`text-sm font-medium ${isCritical ? 'text-red-600' : ''}`}>{formatPaise(availablePaise)}</p>
        </div>
      </div>
    </div>
  );
}
