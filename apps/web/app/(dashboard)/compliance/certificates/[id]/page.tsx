'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Award, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

export default function CertificateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: cert, isLoading } = trpc.compliance.certificates.getById.useQuery({ id });
  const verifyMutation = trpc.compliance.certificates.verify.useMutation();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificate Detail" breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Certificates', href: '/compliance/certificates' },
          { label: 'Loading...' },
        ]} />
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificate Not Found" />
        <p className="text-muted-foreground">The requested certificate could not be found.</p>
      </div>
    );
  }

  const product = cert.product as { id: string; sku: string; name: string } | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Certificate: ${cert.certificateNumber}`}
        description={`${cert.issuingLab} - ${cert.stoneType}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Certificates', href: '/compliance/certificates' },
          { label: cert.certificateNumber as string },
        ]}
        actions={
          !cert.isVerified ? (
            <button
              onClick={() => verifyMutation.mutate({ id })}
              disabled={verifyMutation.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {verifyMutation.isPending ? 'Verifying...' : 'Verify Certificate'}
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Certificate Image */}
        <div className="rounded-lg border p-4">
          <div className="aspect-square rounded-md bg-muted flex items-center justify-center overflow-hidden">
            {cert.imageUrl ? (
              <img src={cert.imageUrl as string} alt={cert.certificateNumber as string} className="h-full w-full object-contain" />
            ) : (
              <Award className="h-16 w-16 text-muted-foreground/20" />
            )}
          </div>
          {cert.certificateUrl && (
            <a
              href={cert.certificateUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View Full Certificate <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Verification status */}
          <div className="flex items-center gap-2">
            {cert.isVerified ? (
              <>
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Verified {cert.verifiedAt ? `on ${new Date(cert.verifiedAt as string).toLocaleDateString()}` : ''}
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Not yet verified</span>
              </>
            )}
          </div>

          {/* Stone details */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Stone Details (4Cs)</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Lab</div>
                <div className="font-medium">{cert.issuingLab as string}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Stone Type</div>
                <div>{cert.stoneType as string}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Carat Weight</div>
                <div>{((cert.caratWeight as number) / 100).toFixed(2)} ct</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Shape</div>
                <div>{(cert.shape as string) ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Color</div>
                <div>{(cert.color as string) ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Clarity</div>
                <div>{(cert.clarity as string) ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cut</div>
                <div>{(cert.cut as string) ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fluorescence</div>
                <div>{(cert.fluorescence as string) ?? '-'}</div>
              </div>
              {cert.dimensions && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Dimensions</div>
                  <div>{cert.dimensions as string}</div>
                </div>
              )}
            </div>
          </div>

          {/* Product link */}
          {product && (
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-2">Linked Product</h3>
              <div className="text-sm">
                <span className="font-mono text-muted-foreground">{product.sku}</span> - {product.name}
              </div>
              <Link
                href={`/compliance/traceability/${product.id}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                View Traceability
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
