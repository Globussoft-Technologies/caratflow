'use client';

import * as React from 'react';

interface Props {
  page: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onChange: (page: number) => void;
}

export function PaginationControls({ page, totalPages, hasPrevious, hasNext, onChange }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={!hasPrevious}
          className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={!hasNext}
          className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
