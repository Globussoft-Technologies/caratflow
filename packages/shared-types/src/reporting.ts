// ─── CaratFlow Reporting Types & Zod Schemas ───────────────────
// Types for reports, analytics, dashboards, forecasting, and
// custom report builder.

import { z } from 'zod';
import { DateRangeSchema, PaginationSchema } from './common';

// ─── Enums ────────────────────────────────────────────────────

export enum ReportTypeEnum {
  SALES = 'SALES',
  INVENTORY = 'INVENTORY',
  FINANCIAL = 'FINANCIAL',
  MANUFACTURING = 'MANUFACTURING',
  CRM = 'CRM',
  CUSTOM = 'CUSTOM',
}

export enum ReportFrequencyEnum {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum ReportFormatEnum {
  PDF = 'PDF',
  XLSX = 'XLSX',
  CSV = 'CSV',
}

export enum ReportExecutionStatusEnum {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum DashboardWidgetTypeEnum {
  STAT_CARD = 'STAT_CARD',
  CHART = 'CHART',
  TABLE = 'TABLE',
  RATE_TICKER = 'RATE_TICKER',
  ALERT_LIST = 'ALERT_LIST',
}

export enum ChartTypeEnum {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  TABLE = 'table',
  AREA = 'area',
}

export enum AggregationType {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
}

export enum GroupByPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

// ─── SavedReport ──────────────────────────────────────────────

export const SavedReportInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  reportType: z.nativeEnum(ReportTypeEnum),
  filters: z.record(z.unknown()).optional(),
  columns: z.array(z.string()).optional(),
  groupBy: z.array(z.string()).optional(),
  sortBy: z.array(z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']),
  })).optional(),
  chartType: z.nativeEnum(ChartTypeEnum).optional(),
  isDefault: z.boolean().default(false),
});
export type SavedReportInput = z.infer<typeof SavedReportInputSchema>;

export const SavedReportResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  reportType: z.nativeEnum(ReportTypeEnum),
  filters: z.record(z.unknown()).nullable(),
  columns: z.array(z.string()).nullable(),
  groupBy: z.array(z.string()).nullable(),
  sortBy: z.array(z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']),
  })).nullable(),
  chartType: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().nullable(),
});
export type SavedReportResponse = z.infer<typeof SavedReportResponseSchema>;

// ─── ScheduledReport ──────────────────────────────────────────

export const ScheduledReportInputSchema = z.object({
  savedReportId: z.string().uuid(),
  frequency: z.nativeEnum(ReportFrequencyEnum),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
  format: z.nativeEnum(ReportFormatEnum).default(ReportFormatEnum.PDF),
  recipients: z.array(z.string().email()).min(1),
  isActive: z.boolean().default(true),
});
export type ScheduledReportInput = z.infer<typeof ScheduledReportInputSchema>;

export const ScheduledReportResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  savedReportId: z.string().uuid(),
  savedReport: SavedReportResponseSchema.optional(),
  frequency: z.nativeEnum(ReportFrequencyEnum),
  dayOfWeek: z.number().nullable(),
  dayOfMonth: z.number().nullable(),
  timeOfDay: z.string(),
  format: z.nativeEnum(ReportFormatEnum),
  recipients: z.array(z.string()),
  isActive: z.boolean(),
  lastRunAt: z.coerce.date().nullable(),
  nextRunAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ScheduledReportResponse = z.infer<typeof ScheduledReportResponseSchema>;

// ─── ReportExecution ──────────────────────────────────────────

export const ReportExecutionResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  savedReportId: z.string().nullable(),
  scheduledReportId: z.string().nullable(),
  reportType: z.nativeEnum(ReportTypeEnum),
  status: z.nativeEnum(ReportExecutionStatusEnum),
  parameters: z.record(z.unknown()).nullable(),
  resultFileUrl: z.string().nullable(),
  rowCount: z.number().nullable(),
  executionTimeMs: z.number().nullable(),
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  error: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type ReportExecutionResponse = z.infer<typeof ReportExecutionResponseSchema>;

// ─── DashboardLayout ──────────────────────────────────────────

export const DashboardWidgetConfigSchema = z.object({
  widgetId: z.string(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(12),
  config: z.record(z.unknown()).optional(),
});
export type DashboardWidgetConfig = z.infer<typeof DashboardWidgetConfigSchema>;

export const DashboardLayoutInputSchema = z.object({
  name: z.string().min(1).max(255),
  isDefault: z.boolean().default(false),
  layout: z.array(DashboardWidgetConfigSchema),
});
export type DashboardLayoutInput = z.infer<typeof DashboardLayoutInputSchema>;

export const DashboardLayoutResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  isDefault: z.boolean(),
  layout: z.array(DashboardWidgetConfigSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type DashboardLayoutResponse = z.infer<typeof DashboardLayoutResponseSchema>;

// ─── Sales Report Types ───────────────────────────────────────

export interface SalesSummaryRow {
  date: string;
  salesCount: number;
  totalRevenuePaise: number;
  avgTicketPaise: number;
  returnCount: number;
  netRevenuePaise: number;
}

export interface SalesByProductRow {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string | null;
  quantitySold: number;
  totalRevenuePaise: number;
}

export interface SalesBySalespersonRow {
  userId: string;
  salespersonName: string;
  salesCount: number;
  totalRevenuePaise: number;
  avgTicketPaise: number;
}

export interface SalesByLocationRow {
  locationId: string;
  locationName: string;
  salesCount: number;
  totalRevenuePaise: number;
  avgTicketPaise: number;
}

export interface SalesByCategoryRow {
  categoryId: string | null;
  categoryName: string;
  quantitySold: number;
  totalRevenuePaise: number;
  percentageOfTotal: number;
}

export interface PaymentBreakdownRow {
  method: string;
  count: number;
  totalPaise: number;
  percentageOfTotal: number;
}

export interface SalesReportResponse {
  summary: SalesSummaryRow[];
  totals: {
    totalSales: number;
    totalRevenuePaise: number;
    avgTicketPaise: number;
    totalReturns: number;
    netRevenuePaise: number;
  };
}

export interface SalesComparisonResponse {
  period1: SalesReportResponse;
  period2: SalesReportResponse;
  changePercent: {
    salesCount: number;
    revenue: number;
    avgTicket: number;
  };
}

// ─── Inventory Report Types ───────────────────────────────────

export interface StockSummaryRow {
  category: string;
  totalItems: number;
  totalQuantity: number;
  totalValuePaise: number;
}

export interface StockByLocationRow {
  locationId: string;
  locationName: string;
  totalItems: number;
  totalQuantity: number;
  totalValuePaise: number;
}

export interface LowStockItem {
  productId: string;
  productName: string;
  sku: string;
  locationName: string;
  quantityOnHand: number;
  reorderLevel: number;
  deficit: number;
}

export interface DeadStockItem {
  productId: string;
  productName: string;
  sku: string;
  locationName: string;
  quantityOnHand: number;
  valuePaise: number;
  daysSinceLastMovement: number;
  lastMovementDate: string | null;
}

export interface StockMoverItem {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string | null;
  totalMovements: number;
  turnoverRate: number;
}

export interface StockAgingRow {
  ageRange: string;
  itemCount: number;
  totalQuantity: number;
  totalValuePaise: number;
}

export interface MetalStockSummaryRow {
  metalType: string;
  purityFineness: number;
  locationName: string;
  weightMg: number;
  valuePaise: number;
}

export interface InventoryReportResponse {
  stockSummary: StockSummaryRow[];
  totalValuePaise: number;
  totalItems: number;
  totalQuantity: number;
}

// ─── Manufacturing Report Types ───────────────────────────────

export interface JobSummaryRow {
  status: string;
  count: number;
  totalEstimatedCostPaise: number;
}

export interface KarigarPerformanceRow {
  karigarId: string;
  karigarName: string;
  jobsCompleted: number;
  totalWeightProcessedMg: number;
  totalWastageMg: number;
  wastagePercent: number;
  avgCompletionDays: number;
  onTimePercent: number;
}

export interface MaterialUsageRow {
  metalType: string;
  purityFineness: number;
  issuedWeightMg: number;
  returnedWeightMg: number;
  wastedWeightMg: number;
  utilizationPercent: number;
}

export interface WastageRow {
  karigarId: string;
  karigarName: string;
  metalType: string;
  issuedWeightMg: number;
  wastedWeightMg: number;
  wastagePercent: number;
}

export interface ProductionTimelineRow {
  jobOrderId: string;
  jobNumber: string;
  productName: string;
  karigarName: string | null;
  estimatedStartDate: string | null;
  estimatedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  daysVariance: number | null;
}

export interface CostAnalysisRow {
  jobOrderId: string;
  jobNumber: string;
  productName: string;
  estimatedCostPaise: number;
  actualCostPaise: number;
  variancePaise: number;
  variancePercent: number;
}

export interface ManufacturingReportResponse {
  jobSummary: JobSummaryRow[];
  totalJobs: number;
  completedJobs: number;
  overdueJobs: number;
}

// ─── CRM Report Types ────────────────────────────────────────

export interface CustomerAcquisitionRow {
  period: string;
  newCustomers: number;
  source: string;
  count: number;
}

export interface CustomerRetentionRow {
  period: string;
  totalCustomers: number;
  repeatCustomers: number;
  retentionRate: number;
}

export interface CustomerLifetimeValueRow {
  customerId: string;
  customerName: string;
  totalSpendPaise: number;
  totalTransactions: number;
  avgTransactionPaise: number;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
}

export interface LoyaltyMetricsResponse {
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  totalPointsExpired: number;
  activeMembers: number;
  tierBreakdown: Array<{ tier: string; count: number }>;
}

export interface LeadConversionRow {
  status: string;
  count: number;
  totalValuePaise: number;
  conversionRate: number;
}

export interface CampaignPerformanceRow {
  campaignId: string;
  campaignName: string;
  channel: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  deliveryRate: number;
}

export interface CrmReportResponse {
  totalCustomers: number;
  newCustomersInPeriod: number;
  repeatPurchaseRate: number;
  avgLifetimeValuePaise: number;
}

// ─── Custom Report Types ──────────────────────────────────────

export const CustomReportFilterSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'like', 'between', 'isNull', 'isNotNull']),
  value: z.unknown(),
});
export type CustomReportFilter = z.infer<typeof CustomReportFilterSchema>;

export const CustomReportAggregationSchema = z.object({
  field: z.string(),
  function: z.nativeEnum(AggregationType),
  alias: z.string().optional(),
});
export type CustomReportAggregation = z.infer<typeof CustomReportAggregationSchema>;

export const CustomReportRequestSchema = z.object({
  entityType: z.string(),
  filters: z.array(CustomReportFilterSchema).default([]),
  columns: z.array(z.string()).min(1),
  groupBy: z.array(z.string()).default([]),
  aggregations: z.array(CustomReportAggregationSchema).default([]),
  sortBy: z.array(z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']),
  })).default([]),
  pagination: PaginationSchema.optional(),
  dateRange: DateRangeSchema.optional(),
});
export type CustomReportRequest = z.infer<typeof CustomReportRequestSchema>;

export interface CustomReportResponse {
  headers: Array<{ key: string; label: string; type: string }>;
  rows: Array<Record<string, unknown>>;
  totals: Record<string, unknown>;
  rowCount: number;
  executionTimeMs: number;
}

export interface SupportedEntity {
  name: string;
  label: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    filterable: boolean;
    sortable: boolean;
    aggregatable: boolean;
  }>;
}

// ─── Forecast Types ───────────────────────────────────────────

export interface ForecastDataPoint {
  period: string;
  actual: number | null;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface ForecastResult {
  entityId: string;
  entityName: string;
  method: string;
  predictions: ForecastDataPoint[];
  accuracy: number;
  mape: number; // Mean Absolute Percentage Error
}

export interface SeasonalPattern {
  month: number;
  monthName: string;
  avgDemand: number;
  seasonalIndex: number;
}

// ─── Dashboard Types ──────────────────────────────────────────

export interface KpiData {
  label: string;
  value: number;
  formattedValue: string;
  unit?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'flat';
  };
}

export interface ChartData {
  title: string;
  chartType: ChartTypeEnum;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

export interface AlertItem {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  actionUrl?: string;
}

export interface AnalyticsDashboardResponse {
  kpis: KpiData[];
  charts: ChartData[];
  alerts: AlertItem[];
  trends: Array<{
    metric: string;
    current: number;
    previous: number;
    changePercent: number;
  }>;
  lastUpdated: string;
}

// ─── Common Report Params ─────────────────────────────────────

export const ReportDateRangeInputSchema = z.object({
  dateRange: DateRangeSchema,
  locationId: z.string().uuid().optional(),
});
export type ReportDateRangeInput = z.infer<typeof ReportDateRangeInputSchema>;

export const SalesReportInputSchema = ReportDateRangeInputSchema.extend({
  groupBy: z.nativeEnum(GroupByPeriod).default(GroupByPeriod.DAY),
  limit: z.number().int().min(1).max(500).default(50),
});
export type SalesReportInput = z.infer<typeof SalesReportInputSchema>;

export const InventoryReportInputSchema = z.object({
  locationId: z.string().uuid().optional(),
  daysSinceLastMovement: z.number().int().min(1).default(90),
  limit: z.number().int().min(1).max(500).default(50),
});
export type InventoryReportInput = z.infer<typeof InventoryReportInputSchema>;

export const ManufacturingReportInputSchema = ReportDateRangeInputSchema.extend({
  karigarId: z.string().uuid().optional(),
});
export type ManufacturingReportInput = z.infer<typeof ManufacturingReportInputSchema>;

export const ForecastInputSchema = z.object({
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  periods: z.number().int().min(1).max(24).default(6),
});
export type ForecastInput = z.infer<typeof ForecastInputSchema>;

export const DashboardInputSchema = z.object({
  dateRange: DateRangeSchema.optional(),
  locationId: z.string().uuid().optional(),
});
export type DashboardInput = z.infer<typeof DashboardInputSchema>;

export const WidgetDataInputSchema = z.object({
  widgetType: z.nativeEnum(DashboardWidgetTypeEnum),
  config: z.record(z.unknown()).default({}),
  dateRange: DateRangeSchema.optional(),
});
export type WidgetDataInput = z.infer<typeof WidgetDataInputSchema>;
