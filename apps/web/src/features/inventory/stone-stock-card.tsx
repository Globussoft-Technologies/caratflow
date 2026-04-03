'use client';

import { Diamond } from 'lucide-react';

interface StoneStockCardProps {
  stoneType: string;
  shape: string | null;
  color: string | null;
  clarity: string | null;
  cutGrade: string | null;
  sizeRange: string | null;
  totalWeightCt: number;
  totalPieces: number;
  valuePaise: number;
  certificationNumber: string | null;
}

export function StoneStockCard({
  stoneType,
  shape,
  color,
  clarity,
  cutGrade,
  sizeRange,
  totalWeightCt,
  totalPieces,
  valuePaise,
  certificationNumber,
}: StoneStockCardProps) {
  const valueRupees = valuePaise / 100;
  // totalWeightCt is stored as centesimal carats (1ct = 100)
  const weightCt = totalWeightCt / 100;

  const fourCsItems = [
    color && { label: 'Color', value: color },
    clarity && { label: 'Clarity', value: clarity },
    cutGrade && { label: 'Cut', value: cutGrade },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Diamond className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{stoneType}</span>
        </div>
        {shape && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{shape}</span>
        )}
      </div>

      {/* 4Cs */}
      {fourCsItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {fourCsItems.map((item) => (
            <div key={item.label} className="rounded-md border px-2 py-1">
              <div className="text-[10px] text-muted-foreground">{item.label}</div>
              <div className="text-xs font-medium">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="text-sm font-semibold">{weightCt.toFixed(2)} ct</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Pieces</div>
          <div className="text-sm font-semibold">{totalPieces}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Size</div>
          <div className="text-sm font-semibold">{sizeRange ?? '-'}</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t">
        <div className="text-sm font-semibold">
          {valueRupees.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
        </div>
        {totalPieces > 0 && (
          <div className="text-xs text-muted-foreground">
            {(valueRupees / totalPieces).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}/pc
          </div>
        )}
      </div>

      {certificationNumber && (
        <div className="mt-2 text-xs text-muted-foreground">
          Cert: {certificationNumber}
        </div>
      )}
    </div>
  );
}
