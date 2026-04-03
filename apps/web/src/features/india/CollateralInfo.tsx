'use client';

import * as React from 'react';
import { Scale, Gem, Image as ImageIcon } from 'lucide-react';

interface CollateralInfoProps {
  metalType: string;
  grossWeightG: string;
  netWeightG: string;
  purityFineness: number;
  description: string;
  images?: string[];
  className?: string;
}

function purityLabel(metalType: string, fineness: number): string {
  if (metalType === 'GOLD') {
    const map: Record<number, string> = { 999: '24K Pure', 916: '22K', 750: '18K', 585: '14K' };
    return map[fineness] ?? `${fineness}`;
  }
  return fineness === 999 ? 'Pure' : `${fineness}`;
}

export function CollateralInfo({
  metalType,
  grossWeightG,
  netWeightG,
  purityFineness,
  description,
  images,
  className,
}: CollateralInfoProps) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${className ?? ''}`}>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Gem className="h-4 w-4 text-amber-600" /> Collateral
      </h4>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <span className="text-muted-foreground">Metal</span>
          <p className="mt-0.5 font-medium">{metalType}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Gross Wt.</span>
          <p className="mt-0.5 flex items-center gap-1 font-medium">
            <Scale className="h-3.5 w-3.5" /> {grossWeightG}g
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Net Wt.</span>
          <p className="mt-0.5 font-medium">{netWeightG}g</p>
        </div>
        <div>
          <span className="text-muted-foreground">Purity</span>
          <p className="mt-0.5 font-medium">{purityLabel(metalType, purityFineness)}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{description}</p>

      {images && images.length > 0 && (
        <div className="mt-3 flex gap-2">
          {images.map((src, i) => (
            <div
              key={i}
              className="flex h-16 w-16 items-center justify-center rounded border bg-muted"
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
