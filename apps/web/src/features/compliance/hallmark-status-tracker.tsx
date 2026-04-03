'use client';

import { CheckCircle2, Circle, XCircle, Clock, Loader2 } from 'lucide-react';

interface HallmarkStatusTrackerProps {
  status: string;
  totalItems: number;
  passedItems: number;
  failedItems: number;
}

const steps = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'IN_PROGRESS', label: 'Testing' },
  { key: 'COMPLETED', label: 'Completed' },
] as const;

function getStepState(stepKey: string, currentStatus: string) {
  const stepIndex = steps.findIndex((s) => s.key === stepKey);
  const currentIndex = steps.findIndex((s) => s.key === currentStatus);

  if (currentStatus === 'REJECTED' || currentStatus === 'PARTIAL_REJECT') {
    if (stepKey === 'COMPLETED') return 'error';
    if (stepIndex <= 1) return 'completed';
  }

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
}

export function HallmarkStatusTracker({ status, totalItems, passedItems, failedItems }: HallmarkStatusTrackerProps) {
  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => {
          const state = getStepState(step.key, status);
          return (
            <div key={step.key} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${state === 'pending' ? 'bg-muted' : 'bg-primary'}`} />}
              <div className="flex items-center gap-1.5">
                {state === 'completed' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                {state === 'active' && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                {state === 'pending' && <Circle className="h-4 w-4 text-muted-foreground" />}
                {state === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                <span className={`text-xs ${state === 'pending' ? 'text-muted-foreground' : 'font-medium'}`}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary counts */}
      <div className="flex gap-4 text-xs">
        <span className="text-muted-foreground">Total: {totalItems}</span>
        <span className="text-emerald-600">Passed: {passedItems}</span>
        <span className="text-red-600">Failed: {failedItems}</span>
        <span className="text-amber-600">Pending: {totalItems - passedItems - failedItems}</span>
      </div>
    </div>
  );
}
