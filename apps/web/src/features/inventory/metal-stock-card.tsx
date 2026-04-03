'use client';

interface MetalStockCardProps {
  metalType: string;
  purityFineness: number;
  weightMg: number;
  valuePaise: number;
}

const metalColors: Record<string, string> = {
  GOLD: 'from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950 dark:to-amber-900 dark:border-amber-800',
  SILVER: 'from-gray-50 to-gray-100 border-gray-200 dark:from-gray-900 dark:to-gray-800 dark:border-gray-700',
  PLATINUM: 'from-slate-50 to-slate-100 border-slate-200 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700',
};

const metalLabels: Record<string, string> = {
  GOLD: 'Gold',
  SILVER: 'Silver',
  PLATINUM: 'Platinum',
};

const purityLabel = (fineness: number): string => {
  const karatMap: Record<number, string> = {
    999: '24K',
    916: '22K',
    750: '18K',
    585: '14K',
    925: '925',
    800: '800',
  };
  return karatMap[fineness] ?? `${fineness}`;
};

export function MetalStockCard({ metalType, purityFineness, weightMg, valuePaise }: MetalStockCardProps) {
  const weightG = weightMg / 1000;
  const valueRupees = valuePaise / 100;
  const colorClass = metalColors[metalType] ?? metalColors.GOLD;

  return (
    <div className={`rounded-lg border bg-gradient-to-br p-5 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {metalLabels[metalType] ?? metalType}
        </span>
        <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium">
          {purityLabel(purityFineness)}
        </span>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold">{weightG.toFixed(3)} g</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {(weightG / 11.664).toFixed(3)} tola
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-current/10">
        <div className="text-sm font-semibold">
          {valueRupees.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
        </div>
        <div className="text-xs text-muted-foreground">
          Rate: {weightG > 0 ? (valueRupees / weightG).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '-'}/g
        </div>
      </div>
    </div>
  );
}
