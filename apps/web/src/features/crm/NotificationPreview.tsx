'use client';

import { StatusBadge } from '@caratflow/ui';
import { Smartphone, Mail, MessageSquare } from 'lucide-react';

interface NotificationPreviewProps {
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  subject?: string;
  body: string;
  variables?: Record<string, string>;
}

function interpolate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

const channelIcons: Record<string, React.ReactNode> = {
  WHATSAPP: <MessageSquare className="h-5 w-5 text-emerald-500" />,
  SMS: <Smartphone className="h-5 w-5 text-blue-500" />,
  EMAIL: <Mail className="h-5 w-5 text-violet-500" />,
};

export function NotificationPreview({ channel, subject, body, variables = {} }: NotificationPreviewProps) {
  const resolvedBody = interpolate(body, variables);
  const resolvedSubject = subject ? interpolate(subject, variables) : undefined;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        {channelIcons[channel]}
        <StatusBadge label={channel} variant="muted" dot={false} />
        <span className="text-sm text-muted-foreground">Preview</span>
      </div>

      {channel === 'EMAIL' ? (
        <div className="rounded-lg border bg-background p-4">
          {resolvedSubject && (
            <div className="border-b pb-2 mb-3">
              <span className="text-xs text-muted-foreground">Subject: </span>
              <span className="text-sm font-medium">{resolvedSubject}</span>
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap">{resolvedBody}</div>
        </div>
      ) : (
        <div className="mx-auto max-w-[300px]">
          <div className={`rounded-2xl p-3 text-sm ${
            channel === 'WHATSAPP'
              ? 'bg-emerald-50 dark:bg-emerald-950'
              : 'bg-blue-50 dark:bg-blue-950'
          }`}>
            <p className="whitespace-pre-wrap">{resolvedBody}</p>
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
