'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/components/format';

export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data, isLoading, refetch } = trpc.crm.videoConsultation.get.useQuery(
    { id },
    { enabled: Boolean(id) },
  );

  const schedule = trpc.crm.videoConsultation.schedule.useMutation({ onSuccess: () => refetch() });
  const start = trpc.crm.videoConsultation.start.useMutation({ onSuccess: () => refetch() });
  const complete = trpc.crm.videoConsultation.complete.useMutation({ onSuccess: () => refetch() });
  const cancel = trpc.crm.videoConsultation.cancel.useMutation({ onSuccess: () => refetch() });
  const markNoShow = trpc.crm.videoConsultation.markNoShow.useMutation({ onSuccess: () => refetch() });

  const [consultantId, setConsultantId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  if (isLoading || !data) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  }

  const c = data as unknown as Record<string, unknown>;
  const status = c.status as string;
  const cust = c.customer as { firstName?: string; lastName?: string; phone?: string | null; email?: string | null } | undefined;
  const customerName = cust ? `${cust.firstName ?? ''} ${cust.lastName ?? ''}`.trim() : 'Customer';

  const canSchedule = status === 'REQUESTED';
  const canStart = status === 'SCHEDULED';
  const canComplete = status === 'SCHEDULED' || status === 'IN_PROGRESS';
  const canCancel = status !== 'COMPLETED' && status !== 'CANCELLED';
  const canNoShow = status === 'SCHEDULED' || status === 'IN_PROGRESS';
  const meetingUrl = c.meetingUrl as string | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Consultation with ${customerName}`}
        description={`Status: ${status}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Consultations', href: '/crm/consultations' },
          { label: id.slice(0, 8) },
        ]}
        actions={<StatusBadge label={status} variant={getStatusVariant(status)} />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <h3 className="font-medium">Customer</h3>
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{customerName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{(cust?.phone as string) ?? (c.customerPhone as string) ?? '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{(cust?.email as string) ?? '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Language</span><span>{(c.preferredLang as string) ?? 'en'}</span></div>
        </div>

        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <h3 className="font-medium">Schedule</h3>
          <div className="flex justify-between"><span className="text-muted-foreground">Requested</span><span>{formatDate(c.requestedAt)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Scheduled</span><span>{formatDate(c.scheduledAt)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Started</span><span>{formatDate(c.startedAt)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ended</span><span>{formatDate(c.endedAt)}</span></div>
        </div>
      </div>

      {meetingUrl && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs uppercase text-muted-foreground">Meeting Link</p>
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Join Meeting
          </a>
          <p className="mt-1 break-all text-xs text-muted-foreground">{meetingUrl}</p>
        </div>
      )}

      {canSchedule && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium">Schedule Consultation</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium">Assign Consultant (User ID)</label>
              <input
                type="text"
                value={consultantId}
                onChange={(e) => setConsultantId(e.target.value)}
                placeholder="user UUID"
                className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Scheduled Time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (!consultantId || !scheduledAt) return;
              schedule.mutate({ id, consultantId, scheduledAt: new Date(scheduledAt) });
            }}
            disabled={schedule.isPending || !consultantId || !scheduledAt}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {schedule.isPending ? 'Scheduling...' : 'Schedule & Generate Link'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canStart && (
          <button
            onClick={() => start.mutate({ id })}
            disabled={start.isPending}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Start
          </button>
        )}
        {canComplete && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Completion notes (optional)"
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              className="h-9 rounded-md border px-2 text-sm"
            />
            <button
              onClick={() => complete.mutate({ id, notes: completeNotes || undefined })}
              disabled={complete.isPending}
              className="h-9 rounded-md border px-4 text-sm disabled:opacity-50"
            >
              Complete
            </button>
          </div>
        )}
        {canNoShow && (
          <button
            onClick={() => markNoShow.mutate({ id })}
            disabled={markNoShow.isPending}
            className="h-9 rounded-md border px-4 text-sm disabled:opacity-50"
          >
            No Show
          </button>
        )}
        {canCancel && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Cancel reason (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="h-9 rounded-md border px-2 text-sm"
            />
            <button
              onClick={() => cancel.mutate({ id, reason: cancelReason || undefined })}
              disabled={cancel.isPending}
              className="h-9 rounded-md border border-destructive px-4 text-sm text-destructive disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {c.notes ? (
        <div className="rounded-lg border p-4">
          <h3 className="font-medium text-sm">Notes</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{c.notes as string}</p>
        </div>
      ) : null}
    </div>
  );
}
