'use client';

import * as React from 'react';
import { cn } from '@caratflow/ui';
import { CheckCircle2, XCircle, Clock, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';

interface WebhookLog {
  id: string;
  source: string;
  eventType: string;
  status: string;
  payload: Record<string, unknown>;
  error?: string | null;
  processedAt?: string | null;
  createdAt: string;
}

interface WebhookLogViewerProps {
  logs: WebhookLog[];
  onRetry?: (logId: string) => void;
}

const statusIcons: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  RECEIVED: { icon: Clock, className: 'text-yellow-600' },
  PROCESSED: { icon: CheckCircle2, className: 'text-green-600' },
  FAILED: { icon: XCircle, className: 'text-red-600' },
};

export function WebhookLogViewer({ logs, onRetry }: WebhookLogViewerProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const config = statusIcons[log.status] ?? statusIcons.RECEIVED;
        const StatusIcon = config.icon;
        const isExpanded = expandedId === log.id;

        return (
          <div key={log.id} className="rounded-lg border">
            <button
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              className="flex items-center justify-between w-full p-3 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <StatusIcon className={cn('h-4 w-4', config.className)} />
                <div>
                  <p className="text-sm font-medium">
                    {log.source} / {log.eventType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {log.status === 'FAILED' && onRetry && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(log.id);
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium hover:bg-accent"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry
                  </button>
                )}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t p-3 space-y-2">
                {log.error && (
                  <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    Error: {log.error}
                  </div>
                )}
                <div className="rounded-md bg-muted p-2">
                  <pre className="text-xs overflow-auto max-h-48">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
