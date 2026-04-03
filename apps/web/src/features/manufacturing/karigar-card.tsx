'use client';

import * as React from 'react';
import { StatusBadge } from '@caratflow/ui';
import { User, Hammer, MapPin } from 'lucide-react';

interface KarigarCardProps {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  skillLevel: string;
  specialization?: string | null;
  locationName?: string;
  isActive: boolean;
  currentJobNumber?: string | null;
  onClick?: (id: string) => void;
}

const SKILL_COLORS: Record<string, 'muted' | 'info' | 'warning' | 'success'> = {
  APPRENTICE: 'muted',
  JUNIOR: 'info',
  SENIOR: 'warning',
  MASTER: 'success',
};

export function KarigarCard({
  id,
  employeeCode,
  firstName,
  lastName,
  skillLevel,
  specialization,
  locationName,
  isActive,
  currentJobNumber,
  onClick,
}: KarigarCardProps) {
  return (
    <div
      className="cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => onClick?.(id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">
              {firstName} {lastName}
            </p>
            <p className="text-xs text-muted-foreground">{employeeCode}</p>
          </div>
        </div>
        <StatusBadge
          label={isActive ? 'Active' : 'Inactive'}
          variant={isActive ? 'success' : 'muted'}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge
          label={skillLevel}
          variant={SKILL_COLORS[skillLevel] ?? 'muted'}
          dot={false}
        />
        {specialization && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Hammer className="h-3 w-3" />
            {specialization}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        {locationName && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {locationName}
          </span>
        )}
        {currentJobNumber && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
            {currentJobNumber}
          </span>
        )}
      </div>
    </div>
  );
}
