import { describe, it, expect } from 'vitest';
import {
  ReportTypeEnum,
  ReportFrequencyEnum,
  ReportFormatEnum,
  ReportExecutionStatusEnum,
  DashboardWidgetTypeEnum,
  ChartTypeEnum,
  AggregationType,
  GroupByPeriod,
  SavedReportInputSchema,
  SavedReportResponseSchema,
  ScheduledReportInputSchema,
  ScheduledReportResponseSchema,
  ReportExecutionResponseSchema,
  DashboardWidgetConfigSchema,
  DashboardLayoutInputSchema,
  DashboardLayoutResponseSchema,
  CustomReportFilterSchema,
  CustomReportAggregationSchema,
  CustomReportRequestSchema,
  ReportDateRangeInputSchema,
  SalesReportInputSchema,
  InventoryReportInputSchema,
  ManufacturingReportInputSchema,
  ForecastInputSchema,
  DashboardInputSchema,
  WidgetDataInputSchema,
} from '../reporting';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '660e8400-e29b-41d4-a716-446655440001';
const NOW = '2026-04-07T10:00:00Z';
const DATE_RANGE = { from: '2026-04-01', to: '2026-04-07' };

// ─── SavedReport Schemas ─────────────────────────────────────

describe('SavedReportInputSchema', () => {
  const validInput = {
    name: 'Monthly Sales',
    reportType: ReportTypeEnum.SALES,
  };

  it('should parse valid input with required fields', () => {
    const result = SavedReportInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isDefault).toBe(false);
    }
  });

  it('should parse with all optional fields', () => {
    const result = SavedReportInputSchema.safeParse({
      ...validInput,
      description: 'Monthly sales summary',
      filters: { locationId: UUID },
      columns: ['date', 'revenue'],
      groupBy: ['date'],
      sortBy: [{ field: 'date', order: 'asc' }],
      chartType: ChartTypeEnum.BAR,
      isDefault: true,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    expect(SavedReportInputSchema.safeParse({ ...validInput, name: '' }).success).toBe(false);
  });

  it('should reject name exceeding 255 chars', () => {
    expect(SavedReportInputSchema.safeParse({ ...validInput, name: 'A'.repeat(256) }).success).toBe(false);
  });

  it('should reject invalid report type', () => {
    expect(SavedReportInputSchema.safeParse({ ...validInput, reportType: 'INVALID' }).success).toBe(false);
  });

  it('should validate all ReportTypeEnum values', () => {
    for (const type of Object.values(ReportTypeEnum)) {
      expect(SavedReportInputSchema.safeParse({ name: 'Test', reportType: type }).success).toBe(true);
    }
  });

  it('should reject invalid sortBy order', () => {
    expect(SavedReportInputSchema.safeParse({
      ...validInput,
      sortBy: [{ field: 'date', order: 'random' }],
    }).success).toBe(false);
  });
});

describe('SavedReportResponseSchema', () => {
  it('should parse valid response', () => {
    const result = SavedReportResponseSchema.safeParse({
      id: UUID,
      tenantId: UUID2,
      name: 'Report',
      description: null,
      reportType: ReportTypeEnum.INVENTORY,
      filters: null,
      columns: null,
      groupBy: null,
      sortBy: null,
      chartType: null,
      isDefault: false,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: null,
    });
    expect(result.success).toBe(true);
  });
});

// ─── ScheduledReport Schemas ─────────────────────────────────

describe('ScheduledReportInputSchema', () => {
  const validInput = {
    savedReportId: UUID,
    frequency: ReportFrequencyEnum.WEEKLY,
    timeOfDay: '09:00',
    recipients: ['admin@jewelry.com'],
  };

  it('should parse valid input with defaults', () => {
    const result = ScheduledReportInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe(ReportFormatEnum.PDF);
      expect(result.data.isActive).toBe(true);
    }
  });

  it('should accept optional dayOfWeek and dayOfMonth', () => {
    const result = ScheduledReportInputSchema.safeParse({
      ...validInput,
      dayOfWeek: 1,
      dayOfMonth: 15,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid timeOfDay format', () => {
    expect(ScheduledReportInputSchema.safeParse({
      ...validInput,
      timeOfDay: '9:00',
    }).success).toBe(false);
    expect(ScheduledReportInputSchema.safeParse({
      ...validInput,
      timeOfDay: '09:00:00',
    }).success).toBe(false);
  });

  it('should reject empty recipients', () => {
    expect(ScheduledReportInputSchema.safeParse({
      ...validInput,
      recipients: [],
    }).success).toBe(false);
  });

  it('should reject invalid email in recipients', () => {
    expect(ScheduledReportInputSchema.safeParse({
      ...validInput,
      recipients: ['not-an-email'],
    }).success).toBe(false);
  });

  it('should reject dayOfWeek out of range', () => {
    expect(ScheduledReportInputSchema.safeParse({ ...validInput, dayOfWeek: 7 }).success).toBe(false);
    expect(ScheduledReportInputSchema.safeParse({ ...validInput, dayOfWeek: -1 }).success).toBe(false);
  });

  it('should reject dayOfMonth out of range', () => {
    expect(ScheduledReportInputSchema.safeParse({ ...validInput, dayOfMonth: 32 }).success).toBe(false);
    expect(ScheduledReportInputSchema.safeParse({ ...validInput, dayOfMonth: 0 }).success).toBe(false);
  });

  it('should validate all frequency values', () => {
    for (const freq of Object.values(ReportFrequencyEnum)) {
      expect(ScheduledReportInputSchema.safeParse({ ...validInput, frequency: freq }).success).toBe(true);
    }
  });

  it('should validate all format values', () => {
    for (const fmt of Object.values(ReportFormatEnum)) {
      expect(ScheduledReportInputSchema.safeParse({ ...validInput, format: fmt }).success).toBe(true);
    }
  });
});

describe('ScheduledReportResponseSchema', () => {
  it('should parse valid response with nullable fields', () => {
    const result = ScheduledReportResponseSchema.safeParse({
      id: UUID,
      tenantId: UUID2,
      savedReportId: UUID,
      frequency: ReportFrequencyEnum.DAILY,
      dayOfWeek: null,
      dayOfMonth: null,
      timeOfDay: '08:00',
      format: ReportFormatEnum.XLSX,
      recipients: ['a@b.com'],
      isActive: true,
      lastRunAt: null,
      nextRunAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

// ─── ReportExecution Schema ──────────────────────────────────

describe('ReportExecutionResponseSchema', () => {
  it('should parse valid execution response', () => {
    const result = ReportExecutionResponseSchema.safeParse({
      id: UUID,
      tenantId: UUID2,
      savedReportId: UUID,
      scheduledReportId: null,
      reportType: ReportTypeEnum.FINANCIAL,
      status: ReportExecutionStatusEnum.COMPLETED,
      parameters: { dateRange: DATE_RANGE },
      resultFileUrl: 'https://s3.example.com/report.pdf',
      rowCount: 150,
      executionTimeMs: 2345,
      startedAt: NOW,
      completedAt: NOW,
      error: null,
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it('should validate all execution statuses', () => {
    for (const status of Object.values(ReportExecutionStatusEnum)) {
      const result = ReportExecutionResponseSchema.safeParse({
        id: UUID,
        tenantId: UUID2,
        savedReportId: null,
        scheduledReportId: null,
        reportType: ReportTypeEnum.SALES,
        status,
        parameters: null,
        resultFileUrl: null,
        rowCount: null,
        executionTimeMs: null,
        startedAt: null,
        completedAt: null,
        error: null,
        createdAt: NOW,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── Dashboard Schemas ───────────────────────────────────────

describe('DashboardWidgetConfigSchema', () => {
  it('should parse valid widget config', () => {
    const result = DashboardWidgetConfigSchema.safeParse({
      widgetId: 'sales-kpi',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional config object', () => {
    const result = DashboardWidgetConfigSchema.safeParse({
      widgetId: 'chart',
      x: 0,
      y: 0,
      w: 6,
      h: 4,
      config: { chartType: 'bar' },
    });
    expect(result.success).toBe(true);
  });

  it('should reject w > 12', () => {
    expect(DashboardWidgetConfigSchema.safeParse({
      widgetId: 'x',
      x: 0,
      y: 0,
      w: 13,
      h: 2,
    }).success).toBe(false);
  });

  it('should reject w < 1', () => {
    expect(DashboardWidgetConfigSchema.safeParse({
      widgetId: 'x',
      x: 0,
      y: 0,
      w: 0,
      h: 2,
    }).success).toBe(false);
  });

  it('should reject negative x or y', () => {
    expect(DashboardWidgetConfigSchema.safeParse({
      widgetId: 'x',
      x: -1,
      y: 0,
      w: 4,
      h: 2,
    }).success).toBe(false);
  });
});

describe('DashboardLayoutInputSchema', () => {
  it('should parse valid layout', () => {
    const result = DashboardLayoutInputSchema.safeParse({
      name: 'My Dashboard',
      layout: [{ widgetId: 'w1', x: 0, y: 0, w: 6, h: 3 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isDefault).toBe(false);
    }
  });

  it('should reject empty name', () => {
    expect(DashboardLayoutInputSchema.safeParse({ name: '', layout: [] }).success).toBe(false);
  });
});

describe('DashboardLayoutResponseSchema', () => {
  it('should parse valid response', () => {
    const result = DashboardLayoutResponseSchema.safeParse({
      id: UUID,
      tenantId: UUID,
      userId: UUID2,
      name: 'Dashboard',
      isDefault: true,
      layout: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

// ─── Custom Report Schemas ───────────────────────────────────

describe('CustomReportFilterSchema', () => {
  it('should parse valid filter', () => {
    const result = CustomReportFilterSchema.safeParse({
      field: 'status',
      operator: 'eq',
      value: 'ACTIVE',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all operator values', () => {
    const operators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'like', 'between', 'isNull', 'isNotNull'];
    for (const op of operators) {
      expect(CustomReportFilterSchema.safeParse({ field: 'f', operator: op, value: 'v' }).success).toBe(true);
    }
  });

  it('should reject invalid operator', () => {
    expect(CustomReportFilterSchema.safeParse({ field: 'f', operator: 'contains', value: 'v' }).success).toBe(false);
  });
});

describe('CustomReportAggregationSchema', () => {
  it('should parse valid aggregation', () => {
    const result = CustomReportAggregationSchema.safeParse({
      field: 'totalRevenuePaise',
      function: AggregationType.SUM,
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional alias', () => {
    const result = CustomReportAggregationSchema.safeParse({
      field: 'price',
      function: AggregationType.AVG,
      alias: 'avgPrice',
    });
    expect(result.success).toBe(true);
  });

  it('should validate all aggregation types', () => {
    for (const fn of Object.values(AggregationType)) {
      expect(CustomReportAggregationSchema.safeParse({ field: 'x', function: fn }).success).toBe(true);
    }
  });
});

describe('CustomReportRequestSchema', () => {
  it('should parse valid request with defaults', () => {
    const result = CustomReportRequestSchema.safeParse({
      entityType: 'product',
      columns: ['name', 'sku', 'price'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filters).toEqual([]);
      expect(result.data.groupBy).toEqual([]);
      expect(result.data.aggregations).toEqual([]);
      expect(result.data.sortBy).toEqual([]);
    }
  });

  it('should parse full request with all fields', () => {
    const result = CustomReportRequestSchema.safeParse({
      entityType: 'sale',
      filters: [{ field: 'status', operator: 'eq', value: 'COMPLETED' }],
      columns: ['date', 'total'],
      groupBy: ['date'],
      aggregations: [{ field: 'total', function: AggregationType.SUM }],
      sortBy: [{ field: 'date', order: 'desc' }],
      pagination: { page: 1, limit: 50 },
      dateRange: DATE_RANGE,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty columns array', () => {
    expect(CustomReportRequestSchema.safeParse({
      entityType: 'product',
      columns: [],
    }).success).toBe(false);
  });

  it('should reject missing entityType', () => {
    expect(CustomReportRequestSchema.safeParse({
      columns: ['name'],
    }).success).toBe(false);
  });
});

// ─── Common Report Param Schemas ─────────────────────────────

describe('ReportDateRangeInputSchema', () => {
  it('should parse with date range', () => {
    const result = ReportDateRangeInputSchema.safeParse({
      dateRange: DATE_RANGE,
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional locationId', () => {
    const result = ReportDateRangeInputSchema.safeParse({
      dateRange: DATE_RANGE,
      locationId: UUID,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid locationId', () => {
    expect(ReportDateRangeInputSchema.safeParse({
      dateRange: DATE_RANGE,
      locationId: 'not-uuid',
    }).success).toBe(false);
  });

  it('should reject missing dateRange', () => {
    expect(ReportDateRangeInputSchema.safeParse({}).success).toBe(false);
  });
});

describe('SalesReportInputSchema', () => {
  it('should parse with defaults', () => {
    const result = SalesReportInputSchema.safeParse({ dateRange: DATE_RANGE });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.groupBy).toBe(GroupByPeriod.DAY);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should validate GroupByPeriod values', () => {
    for (const period of Object.values(GroupByPeriod)) {
      expect(SalesReportInputSchema.safeParse({
        dateRange: DATE_RANGE,
        groupBy: period,
      }).success).toBe(true);
    }
  });

  it('should reject limit > 500', () => {
    expect(SalesReportInputSchema.safeParse({
      dateRange: DATE_RANGE,
      limit: 501,
    }).success).toBe(false);
  });
});

describe('InventoryReportInputSchema', () => {
  it('should parse with defaults', () => {
    const result = InventoryReportInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.daysSinceLastMovement).toBe(90);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should accept optional locationId', () => {
    const result = InventoryReportInputSchema.safeParse({ locationId: UUID });
    expect(result.success).toBe(true);
  });

  it('should reject daysSinceLastMovement < 1', () => {
    expect(InventoryReportInputSchema.safeParse({ daysSinceLastMovement: 0 }).success).toBe(false);
  });
});

describe('ManufacturingReportInputSchema', () => {
  it('should parse with date range', () => {
    const result = ManufacturingReportInputSchema.safeParse({ dateRange: DATE_RANGE });
    expect(result.success).toBe(true);
  });

  it('should accept optional karigarId', () => {
    const result = ManufacturingReportInputSchema.safeParse({
      dateRange: DATE_RANGE,
      karigarId: UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe('ForecastInputSchema', () => {
  it('should parse with defaults', () => {
    const result = ForecastInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.periods).toBe(6);
    }
  });

  it('should accept optional productId and categoryId', () => {
    const result = ForecastInputSchema.safeParse({
      productId: UUID,
      categoryId: UUID2,
      periods: 12,
    });
    expect(result.success).toBe(true);
  });

  it('should reject periods > 24', () => {
    expect(ForecastInputSchema.safeParse({ periods: 25 }).success).toBe(false);
  });

  it('should reject periods < 1', () => {
    expect(ForecastInputSchema.safeParse({ periods: 0 }).success).toBe(false);
  });
});

describe('DashboardInputSchema', () => {
  it('should parse empty input (all optional)', () => {
    expect(DashboardInputSchema.safeParse({}).success).toBe(true);
  });

  it('should accept dateRange and locationId', () => {
    const result = DashboardInputSchema.safeParse({
      dateRange: DATE_RANGE,
      locationId: UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe('WidgetDataInputSchema', () => {
  it('should parse valid widget data input', () => {
    const result = WidgetDataInputSchema.safeParse({
      widgetType: DashboardWidgetTypeEnum.STAT_CARD,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.config).toEqual({});
    }
  });

  it('should validate all widget types', () => {
    for (const wt of Object.values(DashboardWidgetTypeEnum)) {
      expect(WidgetDataInputSchema.safeParse({ widgetType: wt }).success).toBe(true);
    }
  });

  it('should reject invalid widget type', () => {
    expect(WidgetDataInputSchema.safeParse({ widgetType: 'INVALID' }).success).toBe(false);
  });

  it('should accept optional dateRange', () => {
    const result = WidgetDataInputSchema.safeParse({
      widgetType: DashboardWidgetTypeEnum.CHART,
      config: { chartType: 'bar' },
      dateRange: DATE_RANGE,
    });
    expect(result.success).toBe(true);
  });
});
