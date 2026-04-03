'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Shield, Package, Building2, Calendar, Scale } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { HuidBadge } from '@/features/compliance';

export default function HuidDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: record, isLoading } = trpc.compliance.huid.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="HUID Detail"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Compliance', href: '/compliance' },
            { label: 'HUID Registry', href: '/compliance/huid' },
            { label: 'Loading...' },
          ]}
        />
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-lg bg-muted" />
          <div className="h-48 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="space-y-6">
        <PageHeader title="HUID Not Found" />
        <p className="text-muted-foreground">The requested HUID record could not be found.</p>
      </div>
    );
  }

  const product = record.product as { id: string; sku: string; name: string } | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`HUID: ${record.huidNumber}`}
        description={`Registered ${new Date(record.registeredAt as string).toLocaleDateString()}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'HUID Registry', href: '/compliance/huid' },
          { label: record.huidNumber as string },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* HUID Information */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            HUID Information
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">HUID Number</div>
              <div className="font-mono font-bold text-lg">{record.huidNumber as string}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <StatusBadge
                label={record.status as string}
                variant={getStatusVariant(record.status as string)}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Article Type</div>
              <div>{record.articleType as string}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Metal Type</div>
              <div>{record.metalType as string}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Purity (Fineness)</div>
              <div>{record.purityFineness as number}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Weight</div>
              <div>{(Number(record.weightMg) / 1000).toFixed(2)}g</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Registered At</div>
              <div>{new Date(record.registeredAt as string).toLocaleDateString()}</div>
            </div>
            {record.verifiedAt && (
              <div>
                <div className="text-xs text-muted-foreground">Verified At</div>
                <div>{new Date(record.verifiedAt as string).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* Product Link */}
        {product && (
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Linked Product
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">SKU</div>
                <div className="font-mono">{product.sku}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div>{product.name}</div>
              </div>
              <Link
                href={`/compliance/traceability/${product.id}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                View Traceability Chain
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
