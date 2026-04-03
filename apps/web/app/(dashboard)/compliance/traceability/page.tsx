'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { Search, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function TraceabilitySearchPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [enabled, setEnabled] = useState(false);

  const { data: products, isLoading } = trpc.compliance.traceability.search.useQuery(
    { search },
    { enabled: enabled && search.length >= 2 },
  );

  const handleSearch = () => {
    if (search.length >= 2) setEnabled(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traceability"
        description="Search and trace the chain of custody for any product."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Traceability' },
        ]}
      />

      {/* Search bar */}
      <div className="max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by SKU, product name, or HUID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setEnabled(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full rounded-md border bg-background pl-10 pr-24 py-2.5 text-sm"
          />
          <button
            onClick={handleSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {products && products.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">No products found matching your search.</p>
      )}

      {products && products.length > 0 && (
        <div className="space-y-2">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => router.push(`/compliance/traceability/${product.id}`)}
              className="w-full flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
            >
              <div>
                <div className="text-sm font-medium">{product.name}</div>
                <div className="text-xs text-muted-foreground">
                  SKU: {product.sku}
                  {product.huidNumber && ` | HUID: ${product.huidNumber}`}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
