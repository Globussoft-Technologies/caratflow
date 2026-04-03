'use client';

import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import {
  Building2,
  Users,
  Shield,
  Receipt,
  CreditCard,
  Bell,
  Upload,
  Download,
  FileText,
  Languages,
  Settings,
} from 'lucide-react';

const settingsCards = [
  {
    title: 'Company Profile',
    description: 'Business name, logo, address, GST number, and contact details.',
    icon: Building2,
    href: '/settings/company',
  },
  {
    title: 'Branches',
    description: 'Manage showrooms, warehouses, workshops, and office locations.',
    icon: Building2,
    href: '/settings/branches',
  },
  {
    title: 'Users',
    description: 'Invite users, manage accounts, and assign roles.',
    icon: Users,
    href: '/settings/users',
  },
  {
    title: 'Roles & Permissions',
    description: 'Define roles and configure granular access permissions.',
    icon: Shield,
    href: '/settings/roles',
  },
  {
    title: 'Tax Configuration',
    description: 'GSTIN, state code, default GST rates, TDS/TCS settings.',
    icon: Receipt,
    href: '/settings/tax',
  },
  {
    title: 'POS Settings',
    description: 'Invoice prefix, rounding rules, receipt template, payment defaults.',
    icon: CreditCard,
    href: '/settings/pos',
  },
  {
    title: 'Notifications',
    description: 'WhatsApp, SMS, and email provider configuration.',
    icon: Bell,
    href: '/settings/notifications',
  },
  {
    title: 'Import Data',
    description: 'Upload CSV/Excel files to bulk import customers, products, and suppliers.',
    icon: Upload,
    href: '/settings/import',
  },
  {
    title: 'Export Data',
    description: 'Export data to CSV, Excel, or PDF formats.',
    icon: Download,
    href: '/settings/export',
  },
  {
    title: 'Audit Log',
    description: 'View data change history and user activity across the system.',
    icon: FileText,
    href: '/settings/audit',
  },
  {
    title: 'Translations',
    description: 'Manage language translations for multi-lingual support.',
    icon: Languages,
    href: '/settings/i18n',
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="System configuration, user management, and preferences."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-lg border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
