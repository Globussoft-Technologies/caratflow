// ─── Hardware Biometric Attendance Service ────────────────────
// Receives raw biometric events from ZKTeco / ESSL terminals,
// persists them to the dedicated `HardwareBiometricEvent` table,
// reconciles them to karigar attendance records, and exposes
// query helpers used by the REST controller and tRPC router.

import { Injectable } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  BiometricEvent,
  BiometricEventResponse,
  BiometricAttendanceQuery,
  BiometricWebhookPayload,
} from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

interface BiometricEventRow {
  id: string;
  tenantId: string;
  deviceId: string;
  employeeCode: string;
  employeeName: string | null;
  eventType: string;
  eventAt: Date;
  processed: boolean;
  rawPayload: unknown;
  createdAt: Date;
}

@Injectable()
export class HardwareBiometricService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /**
   * Process a biometric check-in/check-out event coming from the
   * tRPC layer (already validated against `BiometricEventSchema`).
   */
  async processEvent(
    tenantId: string,
    input: BiometricEvent,
  ): Promise<BiometricEventResponse> {
    return this.persistEvent(tenantId, {
      deviceId: input.deviceId,
      employeeCode: input.employeeCode,
      eventType: input.eventType,
      timestamp: input.timestamp,
    });
  }

  /**
   * Process a webhook payload posted by a ZKTeco/ESSL terminal.
   * The terminal payload format is loose so this method accepts
   * any pre-parsed `BiometricWebhookPayload` and stores the raw
   * body alongside it for audit.
   */
  async processWebhook(
    tenantId: string,
    payload: BiometricWebhookPayload,
  ): Promise<BiometricEventResponse> {
    return this.persistEvent(
      tenantId,
      {
        deviceId: payload.deviceId ?? payload.deviceSerial ?? 'unknown',
        employeeCode: payload.employeeCode,
        eventType: payload.eventType,
        timestamp: payload.timestamp,
      },
      payload.raw ?? null,
    );
  }

  private async persistEvent(
    tenantId: string,
    input: {
      deviceId: string;
      employeeCode: string;
      eventType: 'CHECK_IN' | 'CHECK_OUT';
      timestamp: string;
    },
    rawPayload: Record<string, unknown> | null = null,
  ): Promise<BiometricEventResponse> {
    const employee = await this.findEmployee(tenantId, input.employeeCode);
    const eventId = uuid();
    const eventAt = new Date(input.timestamp);

    const created = (await this.prisma.hardwareBiometricEvent.create({
      data: {
        id: eventId,
        tenantId,
        deviceId: input.deviceId,
        employeeCode: input.employeeCode,
        employeeName: employee?.name ?? null,
        eventType: input.eventType as never,
        eventAt,
        processed: true,
        rawPayload: (rawPayload ?? undefined) as never,
      },
    })) as unknown as BiometricEventRow;

    await this.recordKarigarAttendance(tenantId, eventAt, input.eventType, employee?.id ?? null);

    await this.eventBus.publish({
      id: uuid(),
      type: 'hardware.biometric.received',
      tenantId,
      userId: 'system',
      timestamp: new Date().toISOString(),
      payload: {
        deviceId: input.deviceId,
        employeeCode: input.employeeCode,
        eventType: input.eventType,
      },
    });

    return this.toResponse(created);
  }

  async getAttendance(
    tenantId: string,
    query: BiometricAttendanceQuery,
  ): Promise<BiometricEventResponse[]> {
    const where: Record<string, unknown> = { tenantId };
    if (query.deviceId) where.deviceId = query.deviceId;
    if (query.employeeCode) where.employeeCode = query.employeeCode;
    if (query.date) {
      const start = new Date(query.date);
      const end = new Date(query.date);
      end.setDate(end.getDate() + 1);
      where.eventAt = { gte: start, lt: end };
    }

    const rows = (await this.prisma.hardwareBiometricEvent.findMany({
      where: where as never,
      orderBy: { eventAt: 'desc' },
      take: 500,
    })) as unknown as BiometricEventRow[];

    return rows.map((r) => this.toResponse(r));
  }

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

    const employeeMap = new Map<
      string,
      {
        employeeCode: string;
        employeeName: string | null;
        checkIn: string | null;
        checkOut: string | null;
      }
    >();
    let totalCheckIns = 0;
    let totalCheckOuts = 0;

    for (const event of events) {
      const existing =
        employeeMap.get(event.employeeCode) ?? {
          employeeCode: event.employeeCode,
          employeeName: event.employeeName,
          checkIn: null,
          checkOut: null,
        };

      if (event.eventType === 'CHECK_IN') {
        if (!existing.checkIn || event.timestamp < existing.checkIn) {
          existing.checkIn = event.timestamp;
        }
        totalCheckIns++;
      } else {
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

  private toResponse(row: BiometricEventRow): BiometricEventResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      deviceId: row.deviceId,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      eventType: row.eventType as 'CHECK_IN' | 'CHECK_OUT',
      timestamp: row.eventAt.toISOString(),
      processed: row.processed,
    };
  }

  private async findEmployee(
    tenantId: string,
    employeeCode: string,
  ): Promise<{ id: string; name: string } | null> {
    // Look up by Karigar employeeCode (manufacturing schema)
    try {
      const karigar = await this.prisma.karigar.findFirst({
        where: { tenantId, employeeCode },
        select: { id: true, firstName: true, lastName: true },
      });
      if (karigar) {
        return {
          id: karigar.id,
          name: `${karigar.firstName} ${karigar.lastName}`.trim(),
        };
      }
    } catch {
      // Karigar table may be unreachable in some environments
    }

    // Fall back to platform User by email (employee code = email)
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: employeeCode },
      select: { id: true, firstName: true, lastName: true },
    });
    if (user) {
      return { id: user.id, name: `${user.firstName} ${user.lastName}`.trim() };
    }
    return null;
  }

  private async recordKarigarAttendance(
    tenantId: string,
    eventAt: Date,
    eventType: 'CHECK_IN' | 'CHECK_OUT',
    karigarId: string | null,
  ): Promise<void> {
    if (!karigarId) return;
    try {
      const day = new Date(eventAt);
      day.setHours(0, 0, 0, 0);

      if (eventType === 'CHECK_IN') {
        // Upsert: create if missing, otherwise update earliest check-in
        await this.prisma.karigarAttendance.upsert({
          where: {
            tenantId_karigarId_date: { tenantId, karigarId, date: day },
          },
          create: {
            id: uuid(),
            tenantId,
            karigarId,
            date: day,
            checkInTime: eventAt,
            createdBy: 'biometric',
            updatedBy: 'biometric',
          },
          update: {
            checkInTime: eventAt,
            updatedBy: 'biometric',
          },
        });
      } else {
        await this.prisma.karigarAttendance.upsert({
          where: {
            tenantId_karigarId_date: { tenantId, karigarId, date: day },
          },
          create: {
            id: uuid(),
            tenantId,
            karigarId,
            date: day,
            checkOutTime: eventAt,
            createdBy: 'biometric',
            updatedBy: 'biometric',
          },
          update: {
            checkOutTime: eventAt,
            updatedBy: 'biometric',
          },
        });
      }
    } catch {
      // Best-effort: don't fail biometric ingest if attendance reconciliation fails
    }
  }
}
