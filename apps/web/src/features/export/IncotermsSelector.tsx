'use client';

const INCOTERMS = [
  { value: 'FOB', label: 'FOB - Free On Board', description: 'Seller delivers goods on board the vessel' },
  { value: 'CIF', label: 'CIF - Cost, Insurance & Freight', description: 'Seller pays cost, insurance, and freight to destination port' },
  { value: 'EXW', label: 'EXW - Ex Works', description: 'Buyer assumes all risk from seller premises' },
  { value: 'DDP', label: 'DDP - Delivered Duty Paid', description: 'Seller delivers goods cleared for import at destination' },
] as const;

interface IncotermsSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function IncotermsSelector({ value, onChange }: IncotermsSelectorProps) {
  return (
    <div>
      <label className="text-sm font-medium">Incoterms *</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        {INCOTERMS.map((term) => (
          <option key={term.value} value={term.value}>
            {term.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-muted-foreground">
        {INCOTERMS.find((t) => t.value === value)?.description}
      </p>
    </div>
  );
}
