'use client';

import { StatusBadge } from '@caratflow/ui';
import Link from 'next/link';

interface PipelineLead {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  source: string;
  estimatedValuePaise: bigint | number | null;
  assignedTo: string | null;
  nextFollowUpDate: Date | null;
}

interface LeadPipelineBoardProps {
  pipeline: Record<string, PipelineLead[]>;
  stages?: string[];
}

function formatMoney(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(paise / 100);
}

export function LeadPipelineBoard({
  pipeline,
  stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'],
}: LeadPipelineBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const leads = pipeline[stage] ?? [];
        return (
          <div key={stage} className="min-w-[240px] flex-1 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">{stage.replace('_', ' ')}</h4>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{leads.length}</span>
            </div>
            <div className="space-y-2">
              {leads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/crm/leads/${lead.id}`}
                  className="block rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <p className="font-medium text-sm">{lead.firstName} {lead.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lead.source.replace('_', ' ')}
                  </p>
                  {lead.estimatedValuePaise && (
                    <p className="text-sm font-medium text-emerald-600 mt-1">
                      {formatMoney(Number(lead.estimatedValuePaise))}
                    </p>
                  )}
                  {lead.assignedTo && (
                    <p className="text-xs text-muted-foreground mt-1">{lead.assignedTo}</p>
                  )}
                </Link>
              ))}
              {leads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No leads</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
