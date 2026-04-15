// ─── Payroll Attendance Service ────────────────────────────────
// Per-day marking, bulk marking, monthly summary, biometric hook.

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type { AttendanceInput, BulkAttendanceInput, AttendanceSummary } from '@caratflow/shared-types';
import { PayrollAttendanceStatus, PayrollAttendanceSource } from '@caratflow/shared-types';

@Injectable()
export class PayrollAttendanceService extends TenantAwareService implements OnModuleInit {
  private readonly logger = new Logger(PayrollAttendanceService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  onModuleInit() {
    // Subscribe to biometric events and write attendance rows
    try {
      this.eventBus.subscribe('hardware.biometric.received', async (event) => {
        try {
          await this.handleBiometricEvent(event as any);
        } catch (err) {
          this.logger.warn(`Biometric handler failed: ${(err as Error).message}`);
        }
      });
    } catch (err) {
      this.logger.warn(`Could not subscribe to biometric events: ${(err as Error).message}`);
    }
  }

  private async handleBiometricEvent(event: {
    tenantId: string;
    payload: { employeeCode: string; eventType: 'CHECK_IN' | 'CHECK_OUT' };
    timestamp: string;
  }) {
    const emp = await this.prisma.employee.findFirst({
      where: { tenantId: event.tenantId, employeeCode: event.payload.employeeCode },
    });
    if (!emp) return;
    const when = new Date(event.timestamp);
    const day = new Date(when.getFullYear(), when.getMonth(), when.getDate());
    const existing = await this.prisma.employeeAttendance.findFirst({
      where: { tenantId: event.tenantId, employeeId: emp.id, date: day },
    });
    if (existing) {
      const update: Record<string, unknown> = { source: PayrollAttendanceSource.BIOMETRIC };
      if (event.payload.eventType === 'CHECK_IN') update.checkInTime = when;
      else update.checkOutTime = when;
      if (existing.checkInTime && event.payload.eventType === 'CHECK_OUT') {
        const hrs = (when.getTime() - new Date(existing.checkInTime).getTime()) / 3600000;
        update.hoursWorked = Math.max(0, hrs);
      }
      await this.prisma.employeeAttendance.update({ where: { id: existing.id }, data: update });
    } else {
      await this.prisma.employeeAttendance.create({
        data: {
          tenantId: event.tenantId,
          employeeId: emp.id,
          date: day,
          status: PayrollAttendanceStatus.PRESENT,
          checkInTime: event.payload.eventType === 'CHECK_IN' ? when : null,
          checkOutTime: event.payload.eventType === 'CHECK_OUT' ? when : null,
          hoursWorked: 0,
          overtimeHours: 0,
          source: PayrollAttendanceSource.BIOMETRIC,
        },
      });
    }
  }

  async list(tenantId: string, params: { employeeId?: string; startDate?: Date; endDate?: Date }) {
    const where: Record<string, unknown> = { tenantId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.startDate || params.endDate) {
      const range: Record<string, Date> = {};
      if (params.startDate) range.gte = params.startDate;
      if (params.endDate) range.lte = params.endDate;
      where.date = range;
    }
    return this.prisma.employeeAttendance.findMany({ where, orderBy: { date: 'desc' } });
  }

  async markDay(tenantId: string, input: AttendanceInput) {
    const day = new Date(
      input.date.getFullYear(),
      input.date.getMonth(),
      input.date.getDate(),
    );
    const existing = await this.prisma.employeeAttendance.findFirst({
      where: { tenantId, employeeId: input.employeeId, date: day },
    });
    if (existing) {
      return this.prisma.employeeAttendance.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          checkInTime: input.checkInTime ?? null,
          checkOutTime: input.checkOutTime ?? null,
          hoursWorked: input.hoursWorked,
          overtimeHours: input.overtimeHours,
          source: input.source,
        },
      });
    }
    return this.prisma.employeeAttendance.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        date: day,
        status: input.status,
        checkInTime: input.checkInTime ?? null,
        checkOutTime: input.checkOutTime ?? null,
        hoursWorked: input.hoursWorked,
        overtimeHours: input.overtimeHours,
        source: input.source,
      },
    });
  }

  async markBulk(tenantId: string, input: BulkAttendanceInput) {
    let count = 0;
    for (const entry of input.entries) {
      await this.markDay(tenantId, entry);
      count++;
    }
    return { count };
  }

  async monthlySummary(
    tenantId: string,
    employeeId: string,
    yearMonth: string, // 'YYYY-MM'
  ): Promise<AttendanceSummary> {
    const [y, m] = yearMonth.split('-').map((v) => parseInt(v, 10));
    const start = new Date(y!, m! - 1, 1);
    const end = new Date(y!, m!, 1);
    const rows = await this.prisma.employeeAttendance.findMany({
      where: { tenantId, employeeId, date: { gte: start, lt: end } },
    });
    const summary: AttendanceSummary = {
      employeeId,
      month: yearMonth,
      workDays: 0,
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      leaveDays: 0,
      unpaidLeaveDays: 0,
      holidays: 0,
      weeklyOffs: 0,
      totalOvertimeHours: 0,
    };
    for (const r of rows) {
      summary.workDays++;
      summary.totalOvertimeHours += r.overtimeHours;
      switch (r.status) {
        case 'PRESENT':
          summary.presentDays++;
          break;
        case 'ABSENT':
          summary.absentDays++;
          break;
        case 'HALF_DAY':
          summary.halfDays++;
          summary.presentDays += 0.5 as number;
          break;
        case 'PAID_LEAVE':
          summary.leaveDays++;
          break;
        case 'UNPAID_LEAVE':
          summary.unpaidLeaveDays++;
          break;
        case 'HOLIDAY':
          summary.holidays++;
          break;
        case 'WEEKLY_OFF':
          summary.weeklyOffs++;
          break;
      }
    }
    return summary;
  }
}
