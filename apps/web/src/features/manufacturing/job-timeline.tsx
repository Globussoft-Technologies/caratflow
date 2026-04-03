'use client';

import * as React from 'react';
import { cn } from '@caratflow/ui';
import { Check, Circle, Clock, X, AlertTriangle } from 'lucide-react';

interface TimelineStep {
  status: string;
  label: string;
  timestamp?: string;
  isActive: boolean;
  isCompleted: boolean;
  isFailed?: boolean;
}

interface JobTimelineProps {
  steps: TimelineStep[];
}

const STATUS_ORDER = [
  'DRAFT',
  'PLANNED',
  'MATERIAL_ISSUED',
  'IN_PROGRESS',
  'QC_PENDING',
  'QC_PASSED',
  'COMPLETED',
] as const;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PLANNED: 'Planned',
  MATERIAL_ISSUED: 'Material Issued',
  IN_PROGRESS: 'In Progress',
  QC_PENDING: 'QC Pending',
  QC_PASSED: 'QC Passed',
  QC_FAILED: 'QC Failed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function buildTimelineSteps(currentStatus: string, dates: {
  createdAt?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}): TimelineStep[] {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus as typeof STATUS_ORDER[number]);
  const isCancelled = currentStatus === 'CANCELLED';
  const isFailed = currentStatus === 'QC_FAILED';

  return STATUS_ORDER.map((status, index) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    timestamp:
      status === 'DRAFT' ? dates.createdAt :
      status === 'IN_PROGRESS' ? dates.actualStartDate :
      status === 'COMPLETED' ? dates.actualEndDate :
      undefined,
    isActive: status === currentStatus,
    isCompleted: !isCancelled && index < currentIndex,
    isFailed: isFailed && status === 'QC_PENDING',
  }));
}

export function JobTimeline({ steps }: JobTimelineProps) {
  return (
    <div className="flex items-start gap-0">
      {steps.map((step, index) => (
        <div key={step.status} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            {index > 0 && (
              <div
                className={cn(
                  'h-0.5 flex-1',
                  step.isCompleted || step.isActive ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                step.isCompleted && 'border-primary bg-primary text-primary-foreground',
                step.isActive && !step.isFailed && 'border-primary bg-primary/10 text-primary',
                step.isFailed && 'border-red-500 bg-red-50 text-red-600',
                !step.isCompleted && !step.isActive && !step.isFailed && 'border-border bg-background text-muted-foreground',
              )}
            >
              {step.isCompleted ? (
                <Check className="h-4 w-4" />
              ) : step.isFailed ? (
                <X className="h-4 w-4" />
              ) : step.isActive ? (
                <Clock className="h-4 w-4" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1',
                  step.isCompleted ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
          <div className="mt-2 text-center">
            <p
              className={cn(
                'text-xs font-medium',
                step.isActive ? 'text-primary' : step.isCompleted ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </p>
            {step.timestamp && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(step.timestamp).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
