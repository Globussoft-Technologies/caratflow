// ─── Hardware Biometric Attendance Service ────────────────────
// Process biometric events, record attendance, query summaries.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  BiometricEvent,
  BiometricEventResponse,
  BiometricAttendanceQuery,
} from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

/** Setting key prefix for biometric events */
const BIOMETRIC_SETTING_CATEGORY = 'hardware';
const BIOMETRIC_KEY_PREFIX = 'biometric-event:';

@Injectable()
export class HardwareBiometricService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Process a biometric check-in/check-out event.
   * Looks up employee by code, records the attendance event.
   */
  async processEvent(
    tenantId: string,
    input: BiometricEvent,
  ): Promise<BiometricEventResponse> {
    // Look up employee by code (using User or Karigar table)
    const employee = await this.findEmployee(tenantId, input.employeeCode);

    const eventId = uuid();
    const now = new Date();

    const eventRecord: BiometricEventResponse = {
      id: eventId,
      tenantId,
      employeeCode: input.employeeCode,
      eventType: input.eventType,
      timestamp: input.timestamp,
      deviceId: input.deviceId,
      employeeName: employee?.name ?? null,
      processed: true,
    };

    // Store event in Settings table
    await this.prisma.setting.create({
      data: {
        id: uuid(),
        tenantId,
        category: BIOMETRIC_SETTING_CATEGORY,
        key: `${BIOMETRIC_KEY_PREFIX}${eventId}`,
        value: JSON.stringify(eventRecord),
        createdBy: 'system',
        updatedBy: 'system',
      },
    });

    // If karigarAttendance model exists, try to record attendance there
    await this.recordKarigarAttendance(tenantId, input, employee);

    return eventRecord;
  }

  /**
   * Get attendance events based on filters.
   */
  async getAttendance(
    tenantId: string,
    query: BiometricAttendanceQuery,
  ): Promise<BiometricEventResponse[]> {
    const settings = await this.prisma.setting.findMany({
      where: {
        tenantId,
        category: BIOMETRIC_SETTING_CATEGORY,
        key: { startsWith: BIOMETRIC_KEY_PREFIX },
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    let events = settings.map(
      (s) => JSON.parse(s.value as string) as BiometricEventResponse,
    );

    // Apply filters
    if (query.deviceId) {
      events = events.filter((e) => e.deviceId === query.deviceId);
    }
    if (query.employeeCode) {
      events = events.filter((e) => e.employeeCode === query.employeeCode);
    }
    if (query.date) {
      const datePrefix = query.date; // Expected format: YYYY-MM-DD
      events = events.filter((e) => e.timestamp.startsWith(datePrefix));
    }

    return events;
  }

  /**
   * Get attendance summary for a specific date and device.
   */
  async getAttendanceSummary(
    tenantId: string,
    date: string,
    deviceId?: string,
  ): Promise<{
    date: string;
    totalCheckIns: number;
    totalCheckOuts: number;
    employees: Array<{
      employeeCode: string;
      employeeName: string | null;
      checkIn: string | null;
      checkOut: string | null;
    }>;
  }> {
    const events = await this.getAttendance(tenantId, { date, deviceId });

    const employeeMap = new Map<string, {
      employeeCode: string;
      employeeName: string | null;
      checkIn: string | null;
      checkOut: string | null;
    }>();

    let totalCheckIns = 0;
    let totalCheckOuts = 0;

    for (const event of events) {
      const existing = employeeMap.get(event.employeeCode) ?? {
        employeeCode: event.employeeCode,
        employeeName: event.employeeName,
        checkIn: null,
        checkOut: null,
      };

      if (event.eventType === 'CHECK_IN') {
        // Use the earliest check-in
        if (!existing.checkIn || event.timestamp < existing.checkIn) {
          existing.checkIn = event.timestamp;
        }
        totalCheckIns++;
      } else {
        // Use the latest check-out
        if (!existing.checkOut || event.timestamp > existing.checkOut) {
          existing.checkOut = event.timestamp;
        }
        totalCheckOuts++;
      }

      employeeMap.set(event.employeeCode, existing);
    }

    return {
      date,
      totalCheckIns,
      totalCheckOuts,
      employees: Array.from(employeeMap.values()),
    };
  }

  // ─── Private Helpers ────────────────────────────────────────

  private async findEmployee(
    tenantId: string,
    employeeCode: string,
  ): Promise<{ id: string; name: string } | null> {
    // Try finding in User table first
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        OR: [
          { employeeCode },
          { email: employeeCode },
        ],
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (user) {
      return { id: user.id, name: `${user.firstName} ${user.lastName}`.trim() };
    }

    // Try Karigar table
    try {
      const karigar = await (this.prisma as Record<string, unknown>).karigar?.findFirst?.({
        where: { tenantId, karigarCode: employeeCode },
        select: { id: true, name: true },
      });
      if (karigar) {
        return karigar as { id: string; name: string };
      }
    } catch {
      // Karigar model may not exist
    }

    return null;
  }

  private async recordKarigarAttendance(
    tenantId: string,
    input: BiometricEvent,
    employee: { id: string; name: string } | null,
  ): Promise<void> {
    if (!employee) return;

    try {
      // Attempt to record in KarigarAttendance if the model exists
      const prismaAny = this.prisma as Record<string, unknown>;
      if (typeof prismaAny.karigarAttendance?.create === 'function') {
        const today = new Date(input.timestamp);
        today.setHours(0, 0, 0, 0);

        if (input.eventType === 'CHECK_IN') {
          await prismaAny.karigarAttendance.create({
            data: {
              id: uuid(),
              tenantId,
              karigarId: employee.id,
              date: today,
              checkIn: new Date(input.timestamp),
              createdBy: 'biometric',
              updatedBy: 'biometric',
            },
          });
        } else {
          // Update existing attendance record with check-out time
          await prismaAny.karigarAttendance.updateMany({
            where: {
              tenantId,
              karigarId: employee.id,
              date: today,
            },
            data: {
              checkOut: new Date(input.timestamp),
              updatedBy: 'biometric',
            },
          });
        }
      }
    } catch {
      // Silently fail if karigar attendance tracking is not set up
    }
  }
}
