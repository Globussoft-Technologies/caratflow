'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

// ─── Page ─────────────────────────────────────────────────────────

export default function NewGirviLoanPage() {
  const [formData, setFormData] = React.useState({
    customerId: '',
    customerName: '',
    locationId: '',
    metalType: 'GOLD',
    grossWeightG: '',
    stoneWeightG: '',
    purityFineness: '916',
    appraisedRatePer10g: '',
    loanPercentage: '75',
    interestRate: '18',
    interestType: 'SIMPLE' as const,
    compoundingPeriod: 'MONTHLY',
    durationMonths: '12',
    collateralDescription: '',
    notes: '',
  });

  const [kycStatus, setKycStatus] = React.useState<{
    aadhaar: boolean;
    pan: boolean;
  } | null>(null);

  // Computed values
  const grossWeightMg = Math.round(parseFloat(formData.grossWeightG || '0') * 1000);
  const stoneWeightMg = Math.round(parseFloat(formData.stoneWeightG || '0') * 1000);
  const netWeightMg = Math.max(0, grossWeightMg - stoneWeightMg);
  const netWeightG = (netWeightMg / 1000).toFixed(3);
  const purity = parseInt(formData.purityFineness || '0', 10);
  const ratePer10gPaise = Math.round(parseFloat(formData.appraisedRatePer10g || '0') * 100);

  // Appraised value = (netWeight / 10g) * rate * (purity/999)
  const weightIn10g = netWeightMg / 10000;
  const purityFactor = purity / 999;
  const appraisedValuePaise = Math.round(weightIn10g * ratePer10gPaise * purityFactor);

  // Loan amount = appraised value * loan percentage
  const loanPercentage = parseInt(formData.loanPercentage || '0', 10);
  const loanAmountPaise = Math.round((appraisedValuePaise * loanPercentage) / 100);

  const formatPaise = (paise: number) =>
    `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Simulate KYC check
  React.useEffect(() => {
    if (formData.customerId) {
      // In production, this would call trpc.india.kyc.getStatus
      setKycStatus({ aadhaar: true, pan: true });
    } else {
      setKycStatus(null);
    }
  }, [formData.customerId]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production: call trpc.india.girvi.create mutation
    console.log('Creating girvi loan:', {
      ...formData,
      grossWeightMg,
      netWeightMg,
      purityFineness: purity,
      appraisedValuePaise,
      loanAmountPaise,
    });
  };

  const isKycValid = kycStatus?.aadhaar || kycStatus?.pan;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Girvi Loan"
        description="Create a mortgage loan against gold or silver collateral."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Girvi', href: '/finance/girvi' },
          { label: 'New Loan' },
        ]}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Customer Selection + KYC */}
        <div className="rounded-lg border bg-card p-6 lg:col-span-3">
          <h3 className="mb-4 text-sm font-semibold">Customer & KYC</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Customer</label>
              <select
                value={formData.customerId}
                onChange={(e) => updateField('customerId', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select customer...</option>
                <option value="cust-1">Ramesh Gupta</option>
                <option value="cust-2">Sunita Devi</option>
                <option value="cust-3">Anil Sharma</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Location</label>
              <select
                value={formData.locationId}
                onChange={(e) => updateField('locationId', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select location...</option>
                <option value="loc-1">Main Showroom</option>
                <option value="loc-2">Warehouse</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">KYC Status</label>
              {kycStatus ? (
                <div className="flex gap-4 pt-2">
                  <span className={`flex items-center gap-1 text-sm ${kycStatus.aadhaar ? 'text-emerald-600' : 'text-red-500'}`}>
                    {kycStatus.aadhaar ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    Aadhaar
                  </span>
                  <span className={`flex items-center gap-1 text-sm ${kycStatus.pan ? 'text-emerald-600' : 'text-red-500'}`}>
                    {kycStatus.pan ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    PAN
                  </span>
                </div>
              ) : (
                <p className="pt-2 text-sm text-muted-foreground">Select a customer first</p>
              )}
            </div>
          </div>
          {kycStatus && !isKycValid && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              At least one KYC document (Aadhaar or PAN) must be verified before creating a loan.
            </div>
          )}
        </div>

        {/* Collateral Details */}
        <div className="rounded-lg border bg-card p-6 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Collateral Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Metal Type</label>
              <select
                value={formData.metalType}
                onChange={(e) => updateField('metalType', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Purity (Fineness)</label>
              <select
                value={formData.purityFineness}
                onChange={(e) => updateField('purityFineness', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="999">999 (24K)</option>
                <option value="916">916 (22K)</option>
                <option value="750">750 (18K)</option>
                <option value="585">585 (14K)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Gross Weight (g)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={formData.grossWeightG}
                onChange={(e) => updateField('grossWeightG', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="0.000"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Stone/Impurity Weight (g)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={formData.stoneWeightG}
                onChange={(e) => updateField('stoneWeightG', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="0.000"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Net Weight</label>
              <p className="text-lg font-semibold">{netWeightG} g</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Rate per 10g (Rs.)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.appraisedRatePer10g}
                onChange={(e) => updateField('appraisedRatePer10g', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Loan % of Appraised Value</label>
              <input
                type="number"
                min="1"
                max="90"
                value={formData.loanPercentage}
                onChange={(e) => updateField('loanPercentage', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Description of Collateral</label>
              <textarea
                value={formData.collateralDescription}
                onChange={(e) => updateField('collateralDescription', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                rows={3}
                placeholder="Describe the items being pledged..."
                required
              />
            </div>
          </div>
        </div>

        {/* Valuation Summary */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Valuation Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Appraised Value</span>
                <span className="font-mono font-medium">{formatPaise(appraisedValuePaise)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Loan Percentage</span>
                <span className="font-medium">{loanPercentage}%</span>
              </div>
              <hr />
              <div className="flex justify-between text-base font-semibold">
                <span>Loan Amount</span>
                <span className="font-mono text-primary">{formatPaise(loanAmountPaise)}</span>
              </div>
            </div>
          </div>

          {/* Interest & Duration */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Interest & Duration</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Annual Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="36"
                  value={formData.interestRate}
                  onChange={(e) => updateField('interestRate', e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Interest Type</label>
                <select
                  value={formData.interestType}
                  onChange={(e) => updateField('interestType', e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="SIMPLE">Simple</option>
                  <option value="COMPOUND">Compound</option>
                </select>
              </div>
              {formData.interestType === 'COMPOUND' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Compounding</label>
                  <select
                    value={formData.compoundingPeriod}
                    onChange={(e) => updateField('compoundingPeriod', e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Duration (Months)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.durationMonths}
                  onChange={(e) => updateField('durationMonths', e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 lg:col-span-3">
          <Link
            href="/finance/girvi"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!isKycValid || loanAmountPaise <= 0}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Create Loan
          </button>
        </div>
      </form>
    </div>
  );
}
