'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface ComplianceResult {
  productCategory: string;
  requiresHallmark: boolean;
  requiresCertificate: boolean;
  restrictedItems: string[];
  notes: string;
}

const MOCK_RESULTS: Record<string, ComplianceResult[]> = {
  US: [
    { productCategory: 'Gold Jewelry (7113)', requiresHallmark: false, requiresCertificate: true, restrictedItems: [], notes: 'Certificate of Origin required. No specific hallmark requirements.' },
    { productCategory: 'Gemstones (7116)', requiresHallmark: false, requiresCertificate: true, restrictedItems: ['Conflict diamonds require Kimberley Process certificate'], notes: 'Gemstone certificates from recognized labs recommended.' },
  ],
  AE: [
    { productCategory: 'Gold Jewelry (7113)', requiresHallmark: true, requiresCertificate: true, restrictedItems: [], notes: 'UAE requires hallmark verification for gold jewelry imports. Minimum 18K purity.' },
    { productCategory: 'Gemstones (7116)', requiresHallmark: false, requiresCertificate: true, restrictedItems: [], notes: 'Dubai Multi Commodities Centre (DMCC) certification recommended.' },
  ],
  GB: [
    { productCategory: 'Gold Jewelry (7113)', requiresHallmark: true, requiresCertificate: true, restrictedItems: [], notes: 'UK requires hallmarking for precious metals over weight thresholds. Assay office hallmark needed.' },
    { productCategory: 'Gemstones (7116)', requiresHallmark: false, requiresCertificate: false, restrictedItems: [], notes: 'Post-Brexit UK rules apply. Standard documentation sufficient.' },
  ],
};

export function ComplianceChecklist() {
  const [country, setCountry] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [results, setResults] = useState<ComplianceResult[] | null>(null);

  const handleCheck = () => {
    // In production, this calls tRPC: export.checkCompliance
    const countryResults = MOCK_RESULTS[country] ?? [];
    setResults(countryResults);
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">Check Export Requirements</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Destination Country *</label>
            <select value={country} onChange={(e) => { setCountry(e.target.value); setResults(null); }} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Select country...</option>
              <option value="US">United States</option>
              <option value="AE">UAE</option>
              <option value="GB">United Kingdom</option>
              <option value="SG">Singapore</option>
              <option value="HK">Hong Kong</option>
              <option value="JP">Japan</option>
              <option value="DE">Germany</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Product Categories</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Gold Jewelry', 'Silver Jewelry', 'Gemstones', 'Diamonds', 'Imitation'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    categories.includes(cat) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleCheck} disabled={!country} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2">
            <Shield className="h-4 w-4" /> Check Compliance
          </button>
        </div>
      </div>

      {results && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">
            Compliance Requirements for {country}
          </h3>

          {results.map((result, idx) => (
            <div key={idx} className="rounded-lg border p-4 space-y-3">
              <h4 className="text-sm font-semibold">{result.productCategory}</h4>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  {result.requiresHallmark ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">
                    Hallmark: {result.requiresHallmark ? 'Required' : 'Not required'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {result.requiresCertificate ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">
                    Certificate: {result.requiresCertificate ? 'Required' : 'Not required'}
                  </span>
                </div>
              </div>

              {result.restrictedItems.length > 0 && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-800">
                    <XCircle className="h-4 w-4" /> Restrictions
                  </div>
                  <ul className="mt-1 list-disc list-inside text-xs text-red-700">
                    {result.restrictedItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-muted-foreground">{result.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
