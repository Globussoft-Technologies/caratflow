'use client';

import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import type { ColumnDef } from '@caratflow/ui';
import { Users, Plus, Upload, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  customerType: string;
  city: string | null;
  loyaltyPoints: number;
  loyaltyTier: string | null;
}

// Placeholder data
const customers: CustomerRow[] = [
  { id: '1', firstName: 'Priya', lastName: 'Sharma', phone: '+919876543210', email: 'priya@example.com', customerType: 'RETAIL', city: 'Mumbai', loyaltyPoints: 2500, loyaltyTier: 'GOLD' },
  { id: '2', firstName: 'Rahul', lastName: 'Mehta', phone: '+919876543211', email: 'rahul@example.com', customerType: 'WHOLESALE', city: 'Delhi', loyaltyPoints: 8200, loyaltyTier: 'PLATINUM' },
  { id: '3', firstName: 'Anita', lastName: 'Desai', phone: '+919876543212', email: null, customerType: 'RETAIL', city: 'Pune', loyaltyPoints: 450, loyaltyTier: 'SILVER' },
  { id: '4', firstName: 'Vikram', lastName: 'Singh', phone: '+919876543213', email: 'vikram@example.com', customerType: 'CORPORATE', city: 'Jaipur', loyaltyPoints: 12000, loyaltyTier: 'DIAMOND' },
  { id: '5', firstName: 'Meena', lastName: 'Patel', phone: '+919876543214', email: 'meena@example.com', customerType: 'RETAIL', city: 'Ahmedabad', loyaltyPoints: 150, loyaltyTier: 'BRONZE' },
];

const columns: ColumnDef<CustomerRow>[] = [
  {
    accessorKey: 'firstName',
    header: 'Name',
    cell: ({ row }) => (
      <Link href={`/crm/customers/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.firstName} {row.original.lastName}
      </Link>
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ getValue }) => getValue() ?? '-',
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ getValue }) => getValue() ?? '-',
  },
  {
    accessorKey: 'customerType',
    header: 'Type',
    cell: ({ getValue }) => {
      const type = getValue() as string;
      return <StatusBadge label={type} variant={type === 'WHOLESALE' ? 'info' : type === 'CORPORATE' ? 'default' : 'muted'} />;
    },
  },
  {
    accessorKey: 'city',
    header: 'City',
    cell: ({ getValue }) => getValue() ?? '-',
  },
  {
    accessorKey: 'loyaltyPoints',
    header: 'Points',
    cell: ({ getValue }) => (getValue() as number).toLocaleString('en-IN'),
  },
  {
    accessorKey: 'loyaltyTier',
    header: 'Tier',
    cell: ({ getValue }) => {
      const tier = getValue() as string | null;
      if (!tier) return '-';
      const variantMap: Record<string, 'muted' | 'default' | 'warning' | 'success' | 'info'> = {
        BRONZE: 'muted',
        SILVER: 'default',
        GOLD: 'warning',
        PLATINUM: 'info',
        DIAMOND: 'success',
      };
      return <StatusBadge label={tier} variant={variantMap[tier] ?? 'default'} />;
    },
  },
];

export default function CustomersPage() {
  const [typeFilter, setTypeFilter] = useState<string>('');

  const filteredCustomers = typeFilter
    ? customers.filter((c) => c.customerType === typeFilter)
    : customers;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer database."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Customers' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent">
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Customer
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">All Types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="CORPORATE">Corporate</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        searchKey="firstName"
        searchPlaceholder="Search by name..."
        onRowClick={(row) => {
          window.location.href = `/crm/customers/${row.id}`;
        }}
      />
    </div>
  );
}
