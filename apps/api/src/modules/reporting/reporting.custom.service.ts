// ─── Reporting Custom Service ─────────────────────────────────
// Custom report builder: dynamic queries against supported entities.

import { Injectable } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  CustomReportRequest,
  CustomReportResponse,
  CustomReportFilter,
  SupportedEntity,
} from '@caratflow/shared-types';

/** Supported entities and their DB table + allowed fields */
const ENTITY_REGISTRY: Record<
  string,
  {
    table: string;
    label: string;
    fields: Array<{
      name: string;
      label: string;
      type: string;
      column: string;
      filterable: boolean;
      sortable: boolean;
      aggregatable: boolean;
    }>;
  }
> = {
  sales: {
    table: 'sales',
    label: 'Sales',
    fields: [
      { name: 'saleNumber', label: 'Sale Number', type: 'string', column: 'sale_number', filterable: true, sortable: true, aggregatable: false },
      { name: 'status', label: 'Status', type: 'string', column: 'status', filterable: true, sortable: true, aggregatable: false },
      { name: 'totalPaise', label: 'Total (Paise)', type: 'number', column: 'total_paise', filterable: true, sortable: true, aggregatable: true },
      { name: 'subtotalPaise', label: 'Subtotal (Paise)', type: 'number', column: 'subtotal_paise', filterable: true, sortable: true, aggregatable: true },
      { name: 'taxPaise', label: 'Tax (Paise)', type: 'number', column: 'tax_paise', filterable: true, sortable: true, aggregatable: true },
      { name: 'discountPaise', label: 'Discount (Paise)', type: 'number', column: 'discount_paise', filterable: true, sortable: true, aggregatable: true },
      { name: 'createdAt', label: 'Created At', type: 'date', column: 'created_at', filterable: true, sortable: true, aggregatable: false },
      { name: 'locationId', label: 'Location ID', type: 'string', column: 'location_id', filterable: true, sortable: false, aggregatable: false },
      { name: 'customerId', label: 'Customer ID', type: 'string', column: 'customer_id', filterable: true, sortable: false, aggregatable: false },
      { name: 'userId', label: 'User ID', type: 'string', column: 'user_id', filterable: true, sortable: false, aggregatable: false },
    ],
  },
  products: {
    table: 'products',
    label: 'Products',
    fields: [
      { name: 'sku', label: 'SKU', type: 'string', column: 'sku', filterable: true, sortable: true, aggregatable: false },
      { name: 'name', label: 'Name', type: 'string', column: 'name', filterable: true, sortable: true, aggregatable: false },
      { name: 'productType', label: 'Type', type: 'string', column: 'product_type', filterable: true, sortable: true, aggregatable: false },
      { name: 'metalPurity', label: 'Metal Purity', type: 'number', column: 'metal_purity', filterable: true, sortable: true, aggregatable: true },
      { name: 'grossWeightMg', label: 'Gross Weight (mg)', type: 'number', column: 'gross_weight_mg', filterable: true, sortable: true, aggregatable: true },
      { name: 'costPricePaise', label: 'Cost Price (Paise)', type: 'number', column: 'cost_price_paise', filterable: true, sortable: true, aggregatable: true },
      { name: 'sellingPricePaise', label: 'Selling Price (Paise)', type: 'number', column: 'selling_price_paise', filterable: true, sortable: true, aggregatable: true },
      { name: 'isActive', label: 'Active', type: 'boolean', column: 'is_active', filterable: true, sortable: false, aggregatable: false },
      { name: 'createdAt', label: 'Created At', type: 'date', column: 'created_at', filterable: true, sortable: true, aggregatable: false },
    ],
  },
  customers: {
    table: 'customers',
    label: 'Customers',
    fields: [
      { name: 'firstName', label: 'First Name', type: 'string', column: 'first_name', filterable: true, sortable: true, aggregatable: false },
      { name: 'lastName', label: 'Last Name', type: 'string', column: 'last_name', filterable: true, sortable: true, aggregatable: false },
      { name: 'phone', label: 'Phone', type: 'string', column: 'phone', filterable: true, sortable: false, aggregatable: false },
      { name: 'email', label: 'Email', type: 'string', column: 'email', filterable: true, sortable: false, aggregatable: false },
      { name: 'customerType', label: 'Type', type: 'string', column: 'customer_type', filterable: true, sortable: true, aggregatable: false },
      { name: 'loyaltyPoints', label: 'Loyalty Points', type: 'number', column: 'loyalty_points', filterable: true, sortable: true, aggregatable: true },
      { name: 'loyaltyTier', label: 'Loyalty Tier', type: 'string', column: 'loyalty_tier', filterable: true, sortable: true, aggregatable: false },
      { name: 'city', label: 'City', type: 'string', column: 'city', filterable: true, sortable: true, aggregatable: false },
      { name: 'createdAt', label: 'Created At', type: 'date', column: 'created_at', filterable: true, sortable: true, aggregatable: false },
    ],
  },
  job_orders: {
    table: 'job_orders',
    label: 'Job Orders',
    fields: [
      { name: 'jobNumber', label: 'Job Number', type: 'string', column: 'job_number', filterable: true, sortable: true, aggregatable: false },
      { name: 'status', label: 'Status', type: 'string', column: 'status', filterable: true, sortable: true, aggregatable: false },
      { name: 'priority', label: 'Priority', type: 'string', column: 'priority', filterable: true, sortable: true, aggregatable: false },
      { name: 'quantity', label: 'Quantity', type: 'number', column: 'quantity', filterable: true, sortable: true, aggregatable: true },
      { name: 'estimatedStartDate', label: 'Est. Start', type: 'date', column: 'estimated_start_date', filterable: true, sortable: true, aggregatable: false },
      { name: 'estimatedEndDate', label: 'Est. End', type: 'date', column: 'estimated_end_date', filterable: true, sortable: true, aggregatable: false },
      { name: 'actualEndDate', label: 'Actual End', type: 'date', column: 'actual_end_date', filterable: true, sortable: true, aggregatable: false },
      { name: 'createdAt', label: 'Created At', type: 'date', column: 'created_at', filterable: true, sortable: true, aggregatable: false },
    ],
  },
  invoices: {
    table: 'invoices',
    label: 'Invoices',
    fields: [
      { name: 'invoiceNumber', label: 'Invoice Number', type: 'string', column: 'invoice_number', filterable: true, sortable: true, aggregatable: false },
      { name: 'invoiceType', label: 'Type', type: 'string', column: 'invoice_type', filterable: true, sortable: true, aggregatable: false },
      { name: 'status', label: 'Status', type: 'string', column: 'status', filterable: true, sortable: true, aggregatable: false },
      { name: 'totalPaise', label: 'Total (Paise)', type: 'number', column: 'total_paise', filterable: true, sortable: true, aggregatable: true },
      { name: 'taxPaise', label: 'Tax (Paise)', type: 'number', column: 'tax_paise', filterable: true, sortable: true, aggregatable: true },
      { name: 'paidPaise', label: 'Paid (Paise)', type: 'number', column: 'paid_paise', filterable: true, sortable: true, aggregatable: true },
      { name: 'dueDate', label: 'Due Date', type: 'date', column: 'due_date', filterable: true, sortable: true, aggregatable: false },
      { name: 'createdAt', label: 'Created At', type: 'date', column: 'created_at', filterable: true, sortable: true, aggregatable: false },
    ],
  },
};

@Injectable()
export class ReportingCustomService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Execute a custom report with dynamic query building.
   */
  async executeCustomReport(
    tenantId: string,
    request: CustomReportRequest,
  ): Promise<CustomReportResponse> {
    const startTime = Date.now();
    const entity = ENTITY_REGISTRY[request.entityType];
    if (!entity) {
      throw new Error(`Unsupported entity type: ${request.entityType}`);
    }

    // Validate columns and build SELECT
    const validFields = entity.fields.map((f) => f.name);
    const selectedColumns = request.columns.filter((c) => validFields.includes(c));
    if (selectedColumns.length === 0) {
      throw new Error('No valid columns selected');
    }

    const fieldMap = new Map(entity.fields.map((f) => [f.name, f]));

    // Build the query parts
    const selectParts: string[] = [];
    const headers: Array<{ key: string; label: string; type: string }> = [];

    // If groupBy is set, use group by columns + aggregations
    if (request.groupBy.length > 0) {
      for (const gb of request.groupBy) {
        const field = fieldMap.get(gb);
        if (field) {
          selectParts.push(`${field.column} AS \`${gb}\``);
          headers.push({ key: gb, label: field.label, type: field.type });
        }
      }

      for (const agg of request.aggregations) {
        const field = fieldMap.get(agg.field);
        if (field && field.aggregatable) {
          const alias = agg.alias ?? `${agg.function.toLowerCase()}_${agg.field}`;
          selectParts.push(`${agg.function}(${field.column}) AS \`${alias}\``);
          headers.push({ key: alias, label: `${agg.function}(${field.label})`, type: 'number' });
        }
      }
    } else {
      for (const col of selectedColumns) {
        const field = fieldMap.get(col);
        if (field) {
          selectParts.push(`${field.column} AS \`${col}\``);
          headers.push({ key: col, label: field.label, type: field.type });
        }
      }
    }

    // Build WHERE clause
    const whereParts: string[] = ['tenant_id = ?'];
    const params: unknown[] = [tenantId];

    // Apply date range filter if provided
    if (request.dateRange) {
      whereParts.push('created_at >= ?');
      params.push(request.dateRange.from);
      whereParts.push('created_at <= ?');
      params.push(request.dateRange.to);
    }

    for (const filter of request.filters) {
      const field = fieldMap.get(filter.field);
      if (!field || !field.filterable) continue;

      const clause = this.buildFilterClause(field.column, filter, params);
      if (clause) whereParts.push(clause);
    }

    // Build GROUP BY
    const groupByParts = request.groupBy
      .map((gb) => fieldMap.get(gb)?.column)
      .filter(Boolean);

    // Build ORDER BY
    const orderByParts = request.sortBy
      .map((s) => {
        const field = fieldMap.get(s.field);
        if (!field || !field.sortable) return null;
        return `${field.column} ${s.order.toUpperCase()}`;
      })
      .filter(Boolean);

    // Assemble query
    let sql = `SELECT ${selectParts.join(', ')} FROM ${entity.table}`;
    sql += ` WHERE ${whereParts.join(' AND ')}`;
    if (groupByParts.length > 0) {
      sql += ` GROUP BY ${groupByParts.join(', ')}`;
    }
    if (orderByParts.length > 0) {
      sql += ` ORDER BY ${orderByParts.join(', ')}`;
    }

    // Pagination
    const page = request.pagination?.page ?? 1;
    const limit = request.pagination?.limit ?? 100;
    sql += ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`;

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      sql,
      ...params,
    );

    // Calculate totals for aggregatable columns
    const totals: Record<string, unknown> = {};
    for (const col of selectedColumns) {
      const field = fieldMap.get(col);
      if (field?.aggregatable && request.groupBy.length === 0) {
        const sum = rows.reduce(
          (s, r) => s + (Number(r[col]) || 0),
          0,
        );
        totals[col] = sum;
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      headers,
      rows: rows.map((r) => this.serializeRow(r)),
      totals,
      rowCount: rows.length,
      executionTimeMs,
    };
  }

  /**
   * Validate that a report configuration is valid.
   */
  validateReportConfig(config: CustomReportRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const entity = ENTITY_REGISTRY[config.entityType];

    if (!entity) {
      errors.push(`Unknown entity type: ${config.entityType}`);
      return { valid: false, errors };
    }

    const validFieldNames = entity.fields.map((f) => f.name);

    for (const col of config.columns) {
      if (!validFieldNames.includes(col)) {
        errors.push(`Invalid column: ${col}`);
      }
    }

    for (const gb of config.groupBy) {
      if (!validFieldNames.includes(gb)) {
        errors.push(`Invalid group-by field: ${gb}`);
      }
    }

    for (const agg of config.aggregations) {
      const field = entity.fields.find((f) => f.name === agg.field);
      if (!field) {
        errors.push(`Invalid aggregation field: ${agg.field}`);
      } else if (!field.aggregatable) {
        errors.push(`Field ${agg.field} is not aggregatable`);
      }
    }

    for (const filter of config.filters) {
      const field = entity.fields.find((f) => f.name === filter.field);
      if (!field) {
        errors.push(`Invalid filter field: ${filter.field}`);
      } else if (!field.filterable) {
        errors.push(`Field ${filter.field} is not filterable`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get list of supported entities and their fields.
   */
  getSupportedEntities(): SupportedEntity[] {
    return Object.entries(ENTITY_REGISTRY).map(([name, config]) => ({
      name,
      label: config.label,
      fields: config.fields.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        filterable: f.filterable,
        sortable: f.sortable,
        aggregatable: f.aggregatable,
      })),
    }));
  }

  // ─── Private Helpers ────────────────────────────────────────

  private buildFilterClause(
    column: string,
    filter: CustomReportFilter,
    params: unknown[],
  ): string | null {
    switch (filter.operator) {
      case 'eq':
        params.push(filter.value);
        return `${column} = ?`;
      case 'neq':
        params.push(filter.value);
        return `${column} != ?`;
      case 'gt':
        params.push(filter.value);
        return `${column} > ?`;
      case 'gte':
        params.push(filter.value);
        return `${column} >= ?`;
      case 'lt':
        params.push(filter.value);
        return `${column} < ?`;
      case 'lte':
        params.push(filter.value);
        return `${column} <= ?`;
      case 'in':
        if (Array.isArray(filter.value)) {
          const placeholders = filter.value.map(() => '?').join(', ');
          params.push(...filter.value);
          return `${column} IN (${placeholders})`;
        }
        return null;
      case 'like':
        params.push(`%${filter.value}%`);
        return `${column} LIKE ?`;
      case 'between':
        if (Array.isArray(filter.value) && filter.value.length === 2) {
          params.push(filter.value[0], filter.value[1]);
          return `${column} BETWEEN ? AND ?`;
        }
        return null;
      case 'isNull':
        return `${column} IS NULL`;
      case 'isNotNull':
        return `${column} IS NOT NULL`;
      default:
        return null;
    }
  }

  private serializeRow(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'bigint') {
        result[key] = Number(value);
      } else if (value instanceof Date) {
        result[key] = value.toISOString();
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
