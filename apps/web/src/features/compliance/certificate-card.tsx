'use client';

import { Award, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface CertificateCardProps {
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
  productName?: string;
}

const labColors: Record<string, string> = {
  GIA: 'bg-blue-100 text-blue-800',
  IGI: 'bg-indigo-100 text-indigo-800',
  HRD: 'bg-purple-100 text-purple-800',
  AGS: 'bg-teal-100 text-teal-800',
  EGL: 'bg-orange-100 text-orange-800',
  SGL: 'bg-rose-100 text-rose-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export function CertificateCard({
  id,
  certificateNumber,
  issuingLab,
  stoneType,
  caratWeight,
  color,
  clarity,
  cut,
  shape,
  isVerified,
  imageUrl,
  productName,
}: CertificateCardProps) {
  const caratDisplay = (caratWeight / 100).toFixed(2);
  const labColor = labColors[issuingLab] ?? labColors['OTHER']!;

  return (
    <Link
      href={`/compliance/certificates/${id}`}
      className="group block rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
    >
      {/* Image / placeholder */}
      <div className="mb-3 aspect-square rounded-md bg-muted flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={certificateNumber} className="h-full w-full object-cover" />
        ) : (
          <Award className="h-12 w-12 text-muted-foreground/30" />
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${labColor}`}>
          {issuingLab}
        </span>
        {isVerified ? (
          <CheckCircle className="h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Certificate number */}
      <div className="text-sm font-medium truncate">{certificateNumber}</div>
      {productName && (
        <div className="text-xs text-muted-foreground truncate">{productName}</div>
      )}

      {/* Stone details */}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <div>Stone: <span className="text-foreground">{stoneType}</span></div>
        <div>Carat: <span className="text-foreground">{caratDisplay} ct</span></div>
        {color && <div>Color: <span className="text-foreground">{color}</span></div>}
        {clarity && <div>Clarity: <span className="text-foreground">{clarity}</span></div>}
        {cut && <div>Cut: <span className="text-foreground">{cut}</span></div>}
        {shape && <div>Shape: <span className="text-foreground">{shape}</span></div>}
      </div>
    </Link>
  );
}
