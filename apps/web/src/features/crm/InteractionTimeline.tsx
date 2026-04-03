'use client';

import { StatusBadge } from '@caratflow/ui';
import { Phone, Mail, MessageSquare, MapPin, FileText } from 'lucide-react';

interface Interaction {
  id: string;
  interactionType: string;
  direction: string;
  subject: string | null;
  content?: string | null;
  createdAt: Date;
}

interface InteractionTimelineProps {
  interactions: Interaction[];
}

const typeIcons: Record<string, React.ReactNode> = {
  CALL: <Phone className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <MessageSquare className="h-4 w-4" />,
  WHATSAPP: <MessageSquare className="h-4 w-4" />,
  VISIT: <MapPin className="h-4 w-4" />,
  NOTE: <FileText className="h-4 w-4" />,
};

export function InteractionTimeline({ interactions }: InteractionTimelineProps) {
  if (interactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No interactions recorded.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {interactions.map((interaction, index) => (
        <div key={interaction.id} className="flex gap-3">
          {/* Timeline connector */}
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/30 bg-background">
              {typeIcons[interaction.interactionType] ?? <MessageSquare className="h-4 w-4" />}
            </div>
            {index < interactions.length - 1 && (
              <div className="w-px flex-1 bg-border min-h-[24px]" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                label={interaction.interactionType}
                variant="default"
                dot={false}
              />
              <StatusBadge
                label={interaction.direction}
                variant={interaction.direction === 'INBOUND' ? 'info' : 'muted'}
                dot={false}
              />
              <span className="text-xs text-muted-foreground">
                {interaction.createdAt.toLocaleDateString('en-IN')}{' '}
                {interaction.createdAt.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {interaction.subject && (
              <p className="mt-1 text-sm font-medium">{interaction.subject}</p>
            )}
            {interaction.content && (
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-3">
                {interaction.content}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
