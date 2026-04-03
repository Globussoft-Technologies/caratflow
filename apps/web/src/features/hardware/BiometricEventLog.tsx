'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import type { BiometricEventResponse } from '@caratflow/shared-types';

interface BiometricEventLogProps {
  deviceId?: string;
  date?: string;
}

/**
 * Recent biometric events table.
 * Shows check-in and check-out events with employee info.
 */
export function BiometricEventLog({
  deviceId,
  date,
}: BiometricEventLogProps) {
  const today = date ?? new Date().toISOString().split('T')[0]!;

  const { data: events, isLoading } = trpc.hardware.biometric.getAttendance.useQuery({
    deviceId,
    date: today,
  });

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-sm font-semibold">Biometric Events</h3>
        <span className="text-xs text-muted-foreground">{today}</span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading events...</div>
      ) : !events?.length ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No events recorded</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event: BiometricEventResponse) => (
                <tr key={event.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">
                    {event.employeeName ?? 'Unknown'}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {event.employeeCode}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        event.eventType === 'CHECK_IN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {event.eventType === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
