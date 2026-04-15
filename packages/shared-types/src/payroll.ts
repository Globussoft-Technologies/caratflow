// ─── CaratFlow Payroll Types ───────────────────────────────────
// Employees, attendance, payroll periods, payslips, salary structures.

import { z } from 'zod';
import { UuidSchema } from './common';

// ─── Enums ────────────────────────────────────────────────────────

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

export enum PayrollAttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  PAID_LEAVE = 'PAID_LEAVE',
  UNPAID_LEAVE = 'UNPAID_LEAVE',
  HOLIDAY = 'HOLIDAY',
  WEEKLY_OFF = 'WEEKLY_OFF',
}

export enum PayrollAttendanceSource {
  BIOMETRIC = 'BIOMETRIC',
  MANUAL = 'MANUAL',
  MOBILE = 'MOBILE',
}

export enum PayrollPeriodStatus {
  DRAFT = 'DRAFT',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
}

export enum PayslipStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

// ─── Zod Schemas ─────────────────────────────────────────────────

export const EmployeeInputSchema = z.object({
  userId: UuidSchema.optional(),
  employeeCode: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dob: z.coerce.date().optional(),
  gender: z.string().max(20).optional(),
  joinedAt: z.coerce.date(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  branchId: UuidSchema.optional(),
  basicSalaryPaise: z.number().int().nonnegative().default(0),
  hraPaise: z.number().int().nonnegative().default(0),
  daPaise: z.number().int().nonnegative().default(0),
  conveyancePaise: z.number().int().nonnegative().default(0),
  medicalPaise: z.number().int().nonnegative().default(0),
  otherAllowancePaise: z.number().int().nonnegative().default(0),
  panNumber: z.string().max(20).optional(),
  aadhaarNumber: z.string().max(20).optional(),
  pfNumber: z.string().max(50).optional(),
  esiNumber: z.string().max(50).optional(),
  bankAccountNumber: z.string().max(50).optional(),
  bankIfsc: z.string().max(20).optional(),
  bankName: z.string().max(100).optional(),
});
export type EmployeeInput = z.infer<typeof EmployeeInputSchema>;

export const EmployeeUpdateSchema = EmployeeInputSchema.partial().extend({
  status: z.nativeEnum(EmployeeStatus).optional(),
  leftAt: z.coerce.date().optional(),
});
export type EmployeeUpdate = z.infer<typeof EmployeeUpdateSchema>;

export const AttendanceInputSchema = z.object({
  employeeId: UuidSchema,
  date: z.coerce.date(),
  status: z.nativeEnum(PayrollAttendanceStatus),
  checkInTime: z.coerce.date().optional(),
  checkOutTime: z.coerce.date().optional(),
  hoursWorked: z.number().nonnegative().default(0),
  overtimeHours: z.number().nonnegative().default(0),
  source: z.nativeEnum(PayrollAttendanceSource).default(PayrollAttendanceSource.MANUAL),
});
export type AttendanceInput = z.infer<typeof AttendanceInputSchema>;

export const BulkAttendanceInputSchema = z.object({
  entries: z.array(AttendanceInputSchema).min(1),
});
export type BulkAttendanceInput = z.infer<typeof BulkAttendanceInputSchema>;

export const PayrollPeriodInputSchema = z.object({
  periodLabel: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
export type PayrollPeriodInput = z.infer<typeof PayrollPeriodInputSchema>;

export const SalaryStructureInputSchema = z.object({
  employeeId: UuidSchema.optional(),
  designation: z.string().max(100).optional(),
  branchId: UuidSchema.optional(),
  name: z.string().min(1).max(100),
  basicPercent: z.number().min(0).max(100).default(50),
  hraPercent: z.number().min(0).max(100).default(20),
  daPercent: z.number().min(0).max(100).default(10),
  conveyancePaise: z.number().int().nonnegative().default(0),
  medicalPaise: z.number().int().nonnegative().default(0),
  otherAllowancePaise: z.number().int().nonnegative().default(0),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
});
export type SalaryStructureInput = z.infer<typeof SalaryStructureInputSchema>;

// ─── Response Interfaces ─────────────────────────────────────────

export interface EmployeeResponse {
  id: string;
  tenantId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  department: string | null;
  branchId: string | null;
  joinedAt: Date;
  leftAt: Date | null;
  status: EmployeeStatus;
  basicSalaryPaise: string; // BigInt as string
  hraPaise: string;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
}

export interface AttendanceSummary {
  employeeId: string;
  month: string;
  workDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  holidays: number;
  weeklyOffs: number;
  totalOvertimeHours: number;
}

export interface PayslipResponse {
  id: string;
  employeeId: string;
  payrollPeriodId: string;
  basicSalary: string;
  hra: string;
  grossSalary: string;
  pfDeduction: string;
  esiDeduction: string;
  tdsDeduction: string;
  professionalTax: string;
  totalDeductions: string;
  netSalary: string;
  status: PayslipStatus;
}

export interface PayrollProcessingResult {
  periodId: string;
  employeesProcessed: number;
  totalGrossPaise: string;
  totalNetPaise: string;
  totalPfPaise: string;
  totalEsiPaise: string;
  totalTdsPaise: string;
  totalPtPaise: string;
}

export interface BankFileRow {
  accountNumber: string;
  ifsc: string;
  name: string;
  amountPaise: string;
  narration: string;
}
