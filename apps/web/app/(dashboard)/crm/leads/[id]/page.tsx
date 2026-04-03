'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import {
  User,
  Phone,
  Mail,
  Target,
  IndianRupee,
  CalendarDays,
  MessageSquare,
  Plus,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

// Placeholder data
const lead = {
  id: '1',
  firstName: 'Ajay',
  lastName: 'Kapoor',
  phone: '+919876543220',
  email: 'ajay.kapoor@example.com',
  source: 'WALK_IN',
  status: 'QUALIFIED',
  assignedTo: 'Ravi Kumar',
  estimatedValuePaise: 5000000,
  notes: 'Interested in 22K gold necklace set for wife birthday. Budget around Rs. 50,000.',
  nextFollowUpDate: new Date(Date.now() + 86400000),
  createdAt: new Date(Date.now() - 5 * 86400000),
};

const activities = [
  { id: 'a1', activityType: 'FOLLOW_UP', description: 'Scheduled follow-up call', scheduledAt: new Date(Date.now() + 86400000), completedAt: null, createdAt: new Date(Date.now() - 86400000) },
  { id: 'a2', activityType: 'MEETING', description: 'Met at showroom, showed collection. Liked 22K temple necklace.', scheduledAt: null, completedAt: new Date(Date.now() - 2 * 86400000), createdAt: new Date(Date.now() - 2 * 86400000) },
  { id: 'a3', activityType: 'CALL', description: 'Initial call - discussed requirements and budget.', scheduledAt: null, completedAt: new Date(Date.now() - 4 * 86400000), createdAt: new Date(Date.now() - 4 * 86400000) },
  { id: 'a4', activityType: 'NOTE', description: 'Lead created from walk-in inquiry.', scheduledAt: null, completedAt: new Date(Date.now() - 5 * 86400000), createdAt: new Date(Date.now() - 5 * 86400000) },
];

const pipelineStages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];

function formatMoney(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(paise / 100);
}

const activityIcons: Record<string, React.ReactNode> = {
  NOTE: <MessageSquare className="h-4 w-4" />,
  CALL: <Phone className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  MEETING: <User className="h-4 w-4" />,
  FOLLOW_UP: <CalendarDays className="h-4 w-4" />,
};

export default function LeadDetailPage() {
  const currentStageIndex = pipelineStages.indexOf(lead.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${lead.firstName} ${lead.lastName}`}
        description="Lead details and activity timeline"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Leads', href: '/crm/leads' },
          { label: `${lead.firstName} ${lead.lastName}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent">
              <CheckCircle className="h-4 w-4" />
              Convert to Customer
            </button>
            <select className="h-9 rounded-md border bg-transparent px-3 text-sm font-medium">
              <option>Update Status</option>
              {pipelineStages.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="LOST">LOST</option>
            </select>
          </div>
        }
      />

      {/* Pipeline Progress */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-1">
          {pipelineStages.map((stage, i) => (
            <div key={stage} className="flex flex-1 items-center">
              <div
                className={`flex h-8 flex-1 items-center justify-center rounded-md text-xs font-medium ${
                  i <= currentStageIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {stage}
              </div>
              {i < pipelineStages.length - 1 && (
                <ArrowRight className={`mx-1 h-4 w-4 flex-shrink-0 ${i < currentStageIndex ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lead Info */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold">Lead Information</h3>
            <div className="mt-4 space-y-3 text-sm">
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>Source: <StatusBadge label={lead.source.replace('_', ' ')} variant="muted" dot={false} /></span>
              </div>
              {lead.estimatedValuePaise && (
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span>Est. Value: <strong>{formatMoney(lead.estimatedValuePaise)}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Assigned: {lead.assignedTo ?? 'Unassigned'}</span>
              </div>
              {lead.nextFollowUpDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>Follow-up: {lead.nextFollowUpDate.toLocaleDateString('en-IN')}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                Created: {lead.createdAt.toLocaleDateString('en-IN')}
              </div>
            </div>
          </div>

          {lead.notes && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold">Notes</h3>
              <p className="mt-2 text-sm text-muted-foreground">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Activity Timeline</h3>
              <button className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-sm hover:bg-accent">
                <Plus className="h-3.5 w-3.5" /> Add Activity
              </button>
            </div>
            <div className="mt-4 space-y-0">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex gap-3">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      activity.completedAt ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 bg-background'
                    }`}>
                      {activityIcons[activity.activityType] ?? <MessageSquare className="h-4 w-4" />}
                    </div>
                    {index < activities.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        label={activity.activityType.replace('_', ' ')}
                        variant={activity.completedAt ? 'success' : 'warning'}
                        dot={false}
                      />
                      <span className="text-xs text-muted-foreground">
                        {activity.completedAt
                          ? activity.completedAt.toLocaleDateString('en-IN')
                          : `Scheduled: ${activity.scheduledAt?.toLocaleDateString('en-IN') ?? '-'}`
                        }
                      </span>
                    </div>
                    {activity.description && (
                      <p className="mt-1 text-sm">{activity.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
