'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { Building2, Plus, MapPin, Phone, Mail } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Branch {
  id: string;
  name: string;
  locationType: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

const locationTypeLabels: Record<string, string> = {
  SHOWROOM: 'Showroom',
  WAREHOUSE: 'Warehouse',
  WORKSHOP: 'Workshop',
  OFFICE: 'Office',
};

const locationTypeColors: Record<string, string> = {
  SHOWROOM: 'bg-blue-100 text-blue-800',
  WAREHOUSE: 'bg-amber-100 text-amber-800',
  WORKSHOP: 'bg-purple-100 text-purple-800',
  OFFICE: 'bg-green-100 text-green-800',
};

type LocationType = 'SHOWROOM' | 'WAREHOUSE' | 'WORKSHOP' | 'OFFICE';

export default function BranchesPage() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    locationType: 'SHOWROOM' as LocationType,
    address: '',
    city: '',
    state: '',
    country: 'IN',
    postalCode: '',
    phone: '',
    email: '',
  });
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const branchesQuery = trpc.platform.branches.list.useQuery({ includeInactive: true });
  const branches = (branchesQuery.data as Branch[] | undefined) ?? [];

  const createMutation = trpc.platform.branches.create.useMutation({
    onSuccess: (created) => {
      setBanner({ type: 'success', message: 'Branch created successfully.' });
      setShowCreateForm(false);
      setFormData({
        name: '',
        locationType: 'SHOWROOM',
        address: '',
        city: '',
        state: '',
        country: 'IN',
        postalCode: '',
        phone: '',
        email: '',
      });
      void branchesQuery.refetch();
      const id = (created as { id?: string } | undefined)?.id;
      if (id) {
        router.push(`/settings/branches/${id}`);
      }
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      setBanner({ type: 'error', message: 'Branch name is required.' });
      return;
    }
    createMutation.mutate({
      name: formData.name.trim(),
      locationType: formData.locationType,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      country: formData.country || undefined,
      postalCode: formData.postalCode || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Manage your showrooms, warehouses, workshops, and office locations."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Branches' },
        ]}
      />

      {banner && (
        <div
          className={`rounded-md border p-3 text-sm ${
            banner.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Branch
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">New Branch</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" htmlFor="branch-name">Branch Name</label>
              <input
                id="branch-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Zaveri Bazaar - Main Showroom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="branch-type">Type</label>
              <select
                id="branch-type"
                value={formData.locationType}
                onChange={(e) => setFormData({ ...formData, locationType: e.target.value as LocationType })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="SHOWROOM">Showroom</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="OFFICE">Office</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="branch-city">City</label>
              <input
                id="branch-city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Mumbai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="branch-state">State</label>
              <input
                id="branch-state"
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Maharashtra"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium" htmlFor="branch-address">Address</label>
              <textarea
                id="branch-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Full address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="branch-phone">Phone</label>
              <input
                id="branch-phone"
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="branch-email">Email</label>
              <input
                id="branch-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Branch'}
            </button>
          </div>
        </div>
      )}

      {/* Branch List */}
      {branchesQuery.isLoading ? (
        <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">Loading branches...</div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No branches yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first branch to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Link
              key={branch.id}
              href={`/settings/branches/${branch.id}`}
              className="rounded-lg border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{branch.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${locationTypeColors[branch.locationType] ?? 'bg-gray-100 text-gray-800'}`}>
                  {locationTypeLabels[branch.locationType] ?? branch.locationType}
                </span>
              </div>
              {branch.address && (
                <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{branch.address}{branch.city ? `, ${branch.city}` : ''}</span>
                </div>
              )}
              {branch.phone && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{branch.phone}</span>
                </div>
              )}
              {branch.email && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{branch.email}</span>
                </div>
              )}
              {!branch.isActive && (
                <span className="mt-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  Inactive
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
