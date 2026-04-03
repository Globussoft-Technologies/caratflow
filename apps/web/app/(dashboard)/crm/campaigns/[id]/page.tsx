'use client';

import { PageHeader, StatCard, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Send, Users, CheckCircle, XCircle, Pause, Play, Ban } from 'lucide-react';

const campaign = {
  id: '1',
  name: 'Diwali Gold Offer',
  description: 'Special Diwali offer: 10% discount on making charges for all gold jewelry purchases above Rs. 25,000.',
  status: 'COMPLETED',
  channel: 'WHATSAPP',
  templateName: 'Diwali Offer Template',
  audienceFilter: { customerType: ['RETAIL'], city: ['Mumbai', 'Pune'] },
  scheduledAt: null,
  startedAt: new Date(Date.now() - 30 * 86400000),
  completedAt: new Date(Date.now() - 29 * 86400000),
  totalRecipients: 450,
  sentCount: 448,
  deliveredCount: 440,
  failedCount: 8,
  createdAt: new Date(Date.now() - 31 * 86400000),
};

export default function CampaignDetailPage() {
  const deliveryRate = campaign.sentCount > 0
    ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        description="Campaign details and delivery metrics"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Campaigns', href: '/crm/campaigns' },
          { label: campaign.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {campaign.status === 'ACTIVE' && (
              <button className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent">
                <Pause className="h-4 w-4" /> Pause
              </button>
            )}
            {campaign.status === 'PAUSED' && (
              <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Play className="h-4 w-4" /> Resume
              </button>
            )}
            {['DRAFT', 'SCHEDULED'].includes(campaign.status) && (
              <>
                <button className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium text-red-600 hover:bg-red-50">
                  <Ban className="h-4 w-4" /> Cancel
                </button>
                <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Send className="h-4 w-4" /> Execute Now
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <StatusBadge label={campaign.status} variant={getStatusVariant(campaign.status)} />
        <StatusBadge label={campaign.channel} variant="muted" dot={false} />
        {campaign.templateName && (
          <span className="text-sm text-muted-foreground">Template: {campaign.templateName}</span>
        )}
      </div>

      {/* Delivery Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Recipients"
          value={campaign.totalRecipients.toLocaleString('en-IN')}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Sent"
          value={campaign.sentCount.toLocaleString('en-IN')}
          icon={<Send className="h-5 w-5" />}
        />
        <StatCard
          title="Delivered"
          value={`${campaign.deliveredCount.toLocaleString('en-IN')} (${deliveryRate}%)`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Failed"
          value={campaign.failedCount.toLocaleString('en-IN')}
          icon={<XCircle className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Description */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Description</h3>
          <p className="mt-2 text-sm text-muted-foreground">{campaign.description}</p>
        </div>

        {/* Audience Filter */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Audience Filter</h3>
          <div className="mt-3 space-y-2 text-sm">
            {campaign.audienceFilter.customerType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer Type</span>
                <span>{campaign.audienceFilter.customerType.join(', ')}</span>
              </div>
            )}
            {campaign.audienceFilter.city && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cities</span>
                <span>{campaign.audienceFilter.city.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-lg border bg-card p-6 lg:col-span-2">
          <h3 className="font-semibold">Timeline</h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{campaign.createdAt.toLocaleDateString('en-IN')}</span>
            </div>
            {campaign.startedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started</span>
                <span>{campaign.startedAt.toLocaleDateString('en-IN')}</span>
              </div>
            )}
            {campaign.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span>{campaign.completedAt.toLocaleDateString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
