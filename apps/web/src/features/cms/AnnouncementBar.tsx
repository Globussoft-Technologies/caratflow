'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AnnouncementBarProps {
  message: string;
  linkUrl?: string | null;
  linkText?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
}

export function AnnouncementBar({
  message,
  linkUrl,
  linkText,
  backgroundColor,
  textColor,
}: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="relative flex items-center justify-center gap-2 px-4 py-2 text-center text-sm"
      style={{
        backgroundColor: backgroundColor ?? '#1e293b',
        color: textColor ?? '#ffffff',
      }}
    >
      <span>{message}</span>
      {linkUrl && linkText && (
        <a
          href={linkUrl}
          className="font-semibold underline underline-offset-2 hover:no-underline"
          style={{ color: textColor ?? '#ffffff' }}
        >
          {linkText}
        </a>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-opacity hover:opacity-70"
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" style={{ color: textColor ?? '#ffffff' }} />
      </button>
    </div>
  );
}
