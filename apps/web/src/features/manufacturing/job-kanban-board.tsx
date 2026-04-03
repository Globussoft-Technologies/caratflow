'use client';

import * as React from 'react';
import { StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Clock, User, ArrowRight } from 'lucide-react';

interface JobCard {
  id: string;
  jobNumber: string;
  productName: string;
  priority: string;
  karigarName?: string;
  estimatedEndDate?: string;
}

interface KanbanColumn {
  status: string;
  label: string;
  jobs: JobCard[];
}

interface JobKanbanBoardProps {
  columns: KanbanColumn[];
  onJobClick?: (jobId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'border-l-slate-400',
  MEDIUM: 'border-l-blue-400',
  HIGH: 'border-l-amber-400',
  URGENT: 'border-l-red-500',
};

export function JobKanbanBoard({ columns, onJobClick }: JobKanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.status} className="min-w-[280px] flex-shrink-0">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{column.label}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {column.jobs.length}
            </span>
          </div>
          <div className="space-y-2">
            {column.jobs.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                No jobs
              </div>
            ) : (
              column.jobs.map((job) => (
                <div
                  key={job.id}
                  className={`cursor-pointer rounded-lg border border-l-4 bg-card p-3 shadow-sm transition-shadow hover:shadow-md ${PRIORITY_COLORS[job.priority] ?? 'border-l-slate-400'}`}
                  onClick={() => onJobClick?.(job.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">{job.jobNumber}</span>
                    <StatusBadge
                      label={job.priority}
                      variant={job.priority === 'URGENT' ? 'danger' : job.priority === 'HIGH' ? 'warning' : 'muted'}
                      dot={false}
                    />
                  </div>
                  <p className="mt-1 text-sm font-medium">{job.productName}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {job.karigarName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {job.karigarName}
                      </span>
                    )}
                    {job.estimatedEndDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(job.estimatedEndDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
