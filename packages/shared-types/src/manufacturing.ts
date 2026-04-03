// ─── CaratFlow Manufacturing Types ─────────────────────────────
// Types for BOM, job orders, artisan management, quality checks,
// production planning, and manufacturing dashboard.

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────

export enum BomStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum BomItemType {
  METAL = 'METAL',
  STONE = 'STONE',
  FINDING = 'FINDING',
  LABOR = 'LABOR',
  OVERHEAD = 'OVERHEAD',
}

export enum MfgJobOrderStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  MATERIAL_ISSUED = 'MATERIAL_ISSUED',
  IN_PROGRESS = 'IN_PROGRESS',
  QC_PENDING = 'QC_PENDING',
  QC_PASSED = 'QC_PASSED',
  QC_FAILED = 'QC_FAILED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum JobPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum JobCostType {
  MATERIAL_METAL = 'MATERIAL_METAL',
  MATERIAL_STONE = 'MATERIAL_STONE',
  MATERIAL_FINDING = 'MATERIAL_FINDING',
  LABOR = 'LABOR',
  OVERHEAD = 'OVERHEAD',
  WASTAGE = 'WASTAGE',
}

export enum KarigarSkillLevel {
  APPRENTICE = 'APPRENTICE',
  JUNIOR = 'JUNIOR',
  SENIOR = 'SENIOR',
  MASTER = 'MASTER',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  LEAVE = 'LEAVE',
}

export enum KarigarMetalType {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
  PALLADIUM = 'PALLADIUM',
  RHODIUM = 'RHODIUM',
}

export enum KarigarTransactionType {
  ISSUE = 'ISSUE',
  RETURN = 'RETURN',
  WASTAGE = 'WASTAGE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum QcCheckpointType {
  IN_PROCESS = 'IN_PROCESS',
  FINAL = 'FINAL',
  HALLMARK = 'HALLMARK',
}

export enum QcStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  REWORK = 'REWORK',
}

export enum ProductionPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

// ─── Job Order Status Transitions ───────────────────────────────

/** Valid status transitions for job orders (state machine). */
export const JOB_ORDER_TRANSITIONS: Record<MfgJobOrderStatus, MfgJobOrderStatus[]> = {
  [MfgJobOrderStatus.DRAFT]: [MfgJobOrderStatus.PLANNED, MfgJobOrderStatus.CANCELLED],
  [MfgJobOrderStatus.PLANNED]: [MfgJobOrderStatus.MATERIAL_ISSUED, MfgJobOrderStatus.CANCELLED],
  [MfgJobOrderStatus.MATERIAL_ISSUED]: [MfgJobOrderStatus.IN_PROGRESS, MfgJobOrderStatus.CANCELLED],
  [MfgJobOrderStatus.IN_PROGRESS]: [MfgJobOrderStatus.QC_PENDING, MfgJobOrderStatus.CANCELLED],
  [MfgJobOrderStatus.QC_PENDING]: [MfgJobOrderStatus.QC_PASSED, MfgJobOrderStatus.QC_FAILED],
  [MfgJobOrderStatus.QC_PASSED]: [MfgJobOrderStatus.COMPLETED],
  [MfgJobOrderStatus.QC_FAILED]: [MfgJobOrderStatus.IN_PROGRESS, MfgJobOrderStatus.CANCELLED],
  [MfgJobOrderStatus.COMPLETED]: [],
  [MfgJobOrderStatus.CANCELLED]: [],
};

// ─── BOM Schemas ────────────────────────────────────────────────

export const BomItemInputSchema = z.object({
  itemType: z.nativeEnum(BomItemType),
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(500),
  quantityRequired: z.number().positive(),
  unitOfMeasure: z.string().min(1).max(20),
  weightMg: z.number().int().nonnegative().optional().nullable(),
  estimatedCostPaise: z.number().int().nonnegative().default(0),
  wastagePercent: z.number().int().min(0).max(10000).default(0),
  sortOrder: z.number().int().min(0).default(0),
});
export type BomItemInput = z.infer<typeof BomItemInputSchema>;

export const BomInputSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.number().int().min(1).default(1),
  productId: z.string().uuid(),
  outputQuantity: z.number().int().min(1).default(1),
  notes: z.string().optional().nullable(),
  estimatedCostPaise: z.number().int().nonnegative().default(0),
  estimatedTimeMins: z.number().int().nonnegative().default(0),
  items: z.array(BomItemInputSchema).min(1),
});
export type BomInput = z.infer<typeof BomInputSchema>;

export const BomUpdateSchema = BomInputSchema.partial().omit({ items: true }).extend({
  items: z.array(BomItemInputSchema).min(1).optional(),
});
export type BomUpdate = z.infer<typeof BomUpdateSchema>;

export interface BomItemResponse {
  id: string;
  itemType: BomItemType;
  productId: string | null;
  productName?: string;
  description: string;
  quantityRequired: number;
  unitOfMeasure: string;
  weightMg: bigint | null;
  estimatedCostPaise: bigint;
  wastagePercent: number;
  sortOrder: number;
}

export interface BomResponse {
  id: string;
  tenantId: string;
  name: string;
  version: number;
  productId: string;
  productName?: string;
  outputQuantity: number;
  status: BomStatus;
  notes: string | null;
  estimatedCostPaise: bigint;
  estimatedTimeMins: number;
  items: BomItemResponse[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

// ─── Job Order Schemas ──────────────────────────────────────────

export const JobOrderInputSchema = z.object({
  bomId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid(),
  customerId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid(),
  priority: z.nativeEnum(JobPriority).default(JobPriority.MEDIUM),
  quantity: z.number().int().min(1).default(1),
  estimatedStartDate: z.coerce.date().optional().nullable(),
  estimatedEndDate: z.coerce.date().optional().nullable(),
  assignedKarigarId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
});
export type JobOrderInput = z.infer<typeof JobOrderInputSchema>;

export const JobOrderStatusUpdateSchema = z.object({
  status: z.nativeEnum(MfgJobOrderStatus),
  notes: z.string().optional(),
});
export type JobOrderStatusUpdate = z.infer<typeof JobOrderStatusUpdateSchema>;

export interface JobOrderResponse {
  id: string;
  tenantId: string;
  jobNumber: string;
  bomId: string | null;
  productId: string;
  productName?: string;
  customerId: string | null;
  customerName?: string;
  locationId: string;
  locationName?: string;
  status: MfgJobOrderStatus;
  priority: JobPriority;
  quantity: number;
  estimatedStartDate: Date | null;
  estimatedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  assignedKarigarId: string | null;
  karigarName?: string;
  notes: string | null;
  specialInstructions: string | null;
  items: JobOrderItemResponse[];
  costs: JobCostResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JobOrderItemResponse {
  id: string;
  bomItemId: string | null;
  productId: string | null;
  description: string;
  requiredWeightMg: bigint;
  issuedWeightMg: bigint;
  returnedWeightMg: bigint;
  wastedWeightMg: bigint;
  costPaise: bigint;
}

export interface JobCostResponse {
  id: string;
  costType: JobCostType;
  description: string;
  amountPaise: bigint;
  weightMg: bigint | null;
}

// ─── Karigar Schemas ────────────────────────────────────────────

export const KarigarInputSchema = z.object({
  employeeCode: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  specialization: z.string().max(255).optional().nullable(),
  skillLevel: z.nativeEnum(KarigarSkillLevel).default(KarigarSkillLevel.JUNIOR),
  dailyWagePaise: z.number().int().nonnegative().default(0),
  locationId: z.string().uuid(),
  isActive: z.boolean().default(true),
  joiningDate: z.coerce.date().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  idProof: z.string().max(255).optional().nullable(),
  bankAccountNumber: z.string().max(30).optional().nullable(),
  ifscCode: z.string().max(11).optional().nullable(),
  panNumber: z.string().max(10).optional().nullable(),
  aadhaarNumber: z.string().max(12).optional().nullable(),
});
export type KarigarInput = z.infer<typeof KarigarInputSchema>;

export interface KarigarResponse {
  id: string;
  tenantId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  skillLevel: KarigarSkillLevel;
  dailyWagePaise: bigint;
  locationId: string;
  locationName?: string;
  isActive: boolean;
  joiningDate: Date | null;
  currentJobId?: string | null;
  currentJobNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Karigar Attendance ─────────────────────────────────────────

export const KarigarAttendanceInputSchema = z.object({
  karigarId: z.string().uuid(),
  date: z.coerce.date(),
  status: z.nativeEnum(AttendanceStatus).default(AttendanceStatus.PRESENT),
  checkInTime: z.coerce.date().optional().nullable(),
  checkOutTime: z.coerce.date().optional().nullable(),
  overtimeMinutes: z.number().int().min(0).default(0),
  wagePaidPaise: z.number().int().nonnegative().default(0),
});
export type KarigarAttendanceInput = z.infer<typeof KarigarAttendanceInputSchema>;

// ─── Karigar Metal Balance ──────────────────────────────────────

export interface KarigarMetalBalanceResponse {
  id: string;
  karigarId: string;
  karigarName: string;
  metalType: KarigarMetalType;
  purityFineness: number;
  issuedWeightMg: bigint;
  returnedWeightMg: bigint;
  wastedWeightMg: bigint;
  balanceWeightMg: bigint;
  lastReconciledAt: Date | null;
}

// ─── Karigar Transaction ────────────────────────────────────────

export const KarigarTransactionInputSchema = z.object({
  karigarId: z.string().uuid(),
  transactionType: z.nativeEnum(KarigarTransactionType),
  jobOrderId: z.string().uuid().optional().nullable(),
  metalType: z.nativeEnum(KarigarMetalType),
  purityFineness: z.number().int().min(1).max(999),
  weightMg: z.number().int().positive(),
  notes: z.string().optional().nullable(),
});
export type KarigarTransactionInput = z.infer<typeof KarigarTransactionInputSchema>;

// ─── Quality Checkpoint ─────────────────────────────────────────

export const QualityCheckpointInputSchema = z.object({
  jobOrderId: z.string().uuid(),
  checkpointType: z.nativeEnum(QcCheckpointType),
  checkedBy: z.string().min(1).max(255),
  status: z.nativeEnum(QcStatus),
  weightMg: z.number().int().nonnegative().optional().nullable(),
  purityFineness: z.number().int().min(0).max(999).optional().nullable(),
  findings: z.string().optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
});
export type QualityCheckpointInput = z.infer<typeof QualityCheckpointInputSchema>;

export interface QcResponse {
  id: string;
  jobOrderId: string;
  jobNumber?: string;
  checkpointType: QcCheckpointType;
  checkedBy: string;
  status: QcStatus;
  weightMg: bigint | null;
  purityFineness: number | null;
  findings: string | null;
  images: string[] | null;
  checkedAt: Date;
}

// ─── Material Requisition ───────────────────────────────────────

export interface MaterialRequisitionItem {
  productId: string | null;
  productName?: string;
  description: string;
  itemType: BomItemType;
  requiredWeightMg: bigint;
  requiredQuantity: number;
  unitOfMeasure: string;
  wastagePercent: number;
  totalWithWastageMg: bigint;
}

export interface MaterialRequisition {
  bomId: string;
  bomName: string;
  quantity: number;
  items: MaterialRequisitionItem[];
  totalEstimatedCostPaise: bigint;
}

// ─── Production Plan ────────────────────────────────────────────

export const ProductionPlanInputSchema = z.object({
  name: z.string().min(1).max(255),
  locationId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().optional().nullable(),
});
export type ProductionPlanInput = z.infer<typeof ProductionPlanInputSchema>;

export const ProductionPlanItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  bomId: z.string().uuid().optional().nullable(),
  priority: z.nativeEnum(JobPriority).default(JobPriority.MEDIUM),
  estimatedStartDate: z.coerce.date().optional().nullable(),
  estimatedEndDate: z.coerce.date().optional().nullable(),
});
export type ProductionPlanItemInput = z.infer<typeof ProductionPlanItemInputSchema>;

export interface ProductionPlanResponse {
  id: string;
  tenantId: string;
  name: string;
  locationId: string;
  locationName?: string;
  startDate: Date;
  endDate: Date;
  status: ProductionPlanStatus;
  notes: string | null;
  items: ProductionPlanItemResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionPlanItemResponse {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  bomId: string | null;
  priority: JobPriority;
  estimatedStartDate: Date | null;
  estimatedEndDate: Date | null;
  jobOrderId: string | null;
  jobNumber?: string | null;
}

// ─── Dashboard ──────────────────────────────────────────────────

export interface ManufacturingDashboardResponse {
  activeJobs: number;
  karigarUtilization: number; // percentage 0-100
  wipValuePaise: bigint;
  pendingQc: number;
  completedToday: number;
  jobsByStatus: Record<MfgJobOrderStatus, number>;
}

// ─── List Filters ───────────────────────────────────────────────

export const JobOrderFilterSchema = z.object({
  status: z.nativeEnum(MfgJobOrderStatus).optional(),
  priority: z.nativeEnum(JobPriority).optional(),
  locationId: z.string().uuid().optional(),
  karigarId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
});
export type JobOrderFilter = z.infer<typeof JobOrderFilterSchema>;

export const BomFilterSchema = z.object({
  status: z.nativeEnum(BomStatus).optional(),
  productId: z.string().uuid().optional(),
  search: z.string().optional(),
});
export type BomFilter = z.infer<typeof BomFilterSchema>;

export const KarigarFilterSchema = z.object({
  locationId: z.string().uuid().optional(),
  skillLevel: z.nativeEnum(KarigarSkillLevel).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});
export type KarigarFilter = z.infer<typeof KarigarFilterSchema>;
