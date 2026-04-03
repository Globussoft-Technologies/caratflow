'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Award, Plus, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { CertificateCard } from '@/features/compliance';

export default function CertificatesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = trpc.compliance.certificates.list.useQuery({
    page,
    limit: 12,
    sortOrder: 'desc',
    search: search || undefined,
  });

  const items = (data?.items ?? []) as Array<{
    id: string;
    certificateNumber: string;
    issuingLab: string;
    stoneType: string;
    caratWeight: number;
    color: string | null;
    clarity: string | null;
    cut: string | null;
    shape: string | null;
    isVerified: boolean;
    imageUrl: string | null;
    product?: { name: string };
  }>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gemstone Certificates"
        description="GIA, IGI, and other lab certificates for diamonds and gemstones."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Certificates' },
        ]}
      />

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by certificate number or stone type..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border bg-background pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      {/* Certificate Gallery */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Award className="mx-auto h-12 w-12 mb-3 opacity-30" />
          <p>No certificates found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((cert) => (
            <CertificateCard
              key={cert.id}
              id={cert.id}
              certificateNumber={cert.certificateNumber}
              issuingLab={cert.issuingLab}
              stoneType={cert.stoneType}
              caratWeight={cert.caratWeight}
              color={cert.color}
              clarity={cert.clarity}
              cut={cert.cut}
              shape={cert.shape}
              isVerified={cert.isVerified}
              imageUrl={cert.imageUrl}
              productName={cert.product?.name}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data.hasPrevious}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.hasNext}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
