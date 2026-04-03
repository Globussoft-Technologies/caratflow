'use client';

import * as React from 'react';
import { Search, Barcode } from 'lucide-react';
import { cn } from '@caratflow/ui';

interface Product {
  id: string;
  sku: string;
  name: string;
  productType: string;
  metalWeightMg: number | null;
  metalPurity: number | null;
  makingCharges: number | null;
  sellingPricePaise: number | null;
}

interface PosProductSearchProps {
  products: Product[];
  onSelect: (product: Product) => void;
  className?: string;
}

export function PosProductSearch({ products, onSelect, className }: PosProductSearchProps) {
  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.productType.toLowerCase().includes(q),
    ).slice(0, 20);
  }, [query, products]);

  const handleSelect = (product: Product) => {
    onSelect(product);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by SKU, name, or scan barcode..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="h-12 w-full rounded-lg border bg-background pl-10 pr-10 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoComplete="off"
        />
        <Barcode className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
          <ul className="max-h-64 overflow-auto py-1">
            {filtered.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={() => handleSelect(product)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      SKU: {product.sku} | {product.productType}
                      {product.metalWeightMg ? ` | ${(product.metalWeightMg / 1000).toFixed(3)}g` : ''}
                      {product.metalPurity ? ` | ${product.metalPurity}` : ''}
                    </div>
                  </div>
                  {product.sellingPricePaise && (
                    <div className="text-sm font-medium">
                      ₹{(product.sellingPricePaise / 100).toLocaleString('en-IN')}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-4 text-center text-sm text-muted-foreground shadow-lg">
          No products found for "{query}"
        </div>
      )}
    </div>
  );
}
