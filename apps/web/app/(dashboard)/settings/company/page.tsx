'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Save, Upload } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface CompanyProfile {
  'company.name': string;
  'company.logo': string;
  'company.address': string;
  'company.phone': string;
  'company.email': string;
  'company.website': string;
}

const defaultProfile: CompanyProfile = {
  'company.name': '',
  'company.logo': '',
  'company.address': '',
  'company.phone': '',
  'company.email': '',
  'company.website': '',
};

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile>(defaultProfile);

  const { data: loaded, isLoading, refetch } = trpc.platform.settings.getAll.useQuery({ category: 'general' });
  const setSettingsMutation = trpc.platform.settings.set.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  useEffect(() => {
    if (!loaded) return;
    const payload = loaded as { grouped?: Record<string, Record<string, unknown>> } | undefined;
    const general = payload?.grouped?.general ?? {};
    setProfile((prev) => ({
      ...prev,
      ...Object.fromEntries(
        (Object.keys(defaultProfile) as Array<keyof CompanyProfile>).map((key) => [
          key,
          (general[key] as string | undefined) ?? prev[key],
        ]),
      ),
    }) as CompanyProfile);
  }, [loaded]);

  const handleChange = (key: keyof CompanyProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const payload = (Object.keys(profile) as Array<keyof CompanyProfile>).map((key) => ({
      key,
      value: profile[key],
      category: 'general' as const,
    }));
    setSettingsMutation.mutate({ settings: payload });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Profile"
        description="Manage your business identity and contact information."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Company Profile' },
        ]}
      />

      {setSettingsMutation.isSuccess && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Company profile saved successfully.
        </div>
      )}
      {setSettingsMutation.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to save: {setSettingsMutation.error.message}
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Business Information</h2>
          <p className="text-sm text-muted-foreground">
            This information appears on invoices, receipts, and customer-facing documents.
          </p>
        </div>

        <div className="space-y-6 p-6">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading settings...</div>
          ) : (
            <>
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium">Company Logo</label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                    {profile['company.logo'] ? (
                      <img
                        src={profile['company.logo']}
                        alt="Logo"
                        className="h-full w-full rounded-lg object-contain"
                      />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  {/* TODO: needs platform.files.uploadLogo mutation once a logo-upload procedure exists. */}
                  <input
                    type="url"
                    value={profile['company.logo']}
                    onChange={(e) => handleChange('company.logo', e.target.value)}
                    placeholder="Logo URL (https://...)"
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium" htmlFor="company-name">
                    Company Name
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    value={profile['company.name']}
                    onChange={(e) => handleChange('company.name', e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Sharma Jewellers Pvt. Ltd."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium" htmlFor="company-phone">
                    Phone
                  </label>
                  <input
                    id="company-phone"
                    type="text"
                    value={profile['company.phone']}
                    onChange={(e) => handleChange('company.phone', e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium" htmlFor="company-email">
                    Email
                  </label>
                  <input
                    id="company-email"
                    type="email"
                    value={profile['company.email']}
                    onChange={(e) => handleChange('company.email', e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="info@sharmajewellers.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium" htmlFor="company-website">
                    Website
                  </label>
                  <input
                    id="company-website"
                    type="url"
                    value={profile['company.website']}
                    onChange={(e) => handleChange('company.website', e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="https://sharmajewellers.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium" htmlFor="company-address">
                  Address
                </label>
                <textarea
                  id="company-address"
                  value={profile['company.address']}
                  onChange={(e) => handleChange('company.address', e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Shop No. 12, Zaveri Bazaar, Mumbai 400003"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end border-t p-4">
          <button
            onClick={handleSave}
            disabled={setSettingsMutation.isPending || isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {setSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
