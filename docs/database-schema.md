# CaratFlow Database Schema

## Overview

CaratFlow uses MySQL 8 with Prisma 6 ORM. Schemas are split by domain module, with each module owning its own `.prisma` file in `packages/db/prisma/schema/`.

## Entity Relationship Summary

### Core / Platform

| Table           | Description                                    |
|-----------------|------------------------------------------------|
| tenants         | Multi-tenant organizations                     |
| users           | User accounts (tenant-scoped)                  |
| roles           | RBAC roles with JSON permissions               |
| refresh_tokens  | JWT refresh token storage                      |
| locations       | Physical store/warehouse locations             |
| audit_logs      | System-wide audit trail                        |

### Inventory

| Table              | Description                                 |
|--------------------|---------------------------------------------|
| products           | Product catalog (jewelry, bullion, etc.)     |
| product_categories | Hierarchical product categories              |
| stock_items        | Stock level per product per location         |
| stock_movements    | IN/OUT/ADJUSTMENT stock movement records     |
| stock_transfers    | Inter-location stock transfers               |
| stock_takes        | Physical stock count sessions                |
| stock_take_items   | Individual item counts in a stock take       |
| metal_stock        | Bulk metal stock (gold/silver by purity)     |
| stone_stock        | Gemstone/diamond stock                       |
| batch_lots         | Batch/lot tracking for traceability          |
| serial_numbers     | Individual item serial number tracking       |

### Retail / POS

| Table              | Description                                 |
|--------------------|---------------------------------------------|
| sales              | Completed sales transactions                |
| sale_line_items    | Individual items in a sale                  |
| sale_payments      | Payment records for a sale                  |
| sale_returns       | Return/exchange transactions                |
| repair_orders      | Jewelry repair tracking                     |
| custom_orders      | Custom/bespoke jewelry orders               |
| layaways           | Layaway/installment purchase plans          |
| discounts          | Discount rules and promotions               |

### Financial

| Table               | Description                                |
|---------------------|---------------------------------------------|
| accounts            | Chart of accounts (assets, liabilities, etc.) |
| journal_entries     | Double-entry journal entries                |
| journal_entry_lines | Individual debit/credit lines               |
| invoices            | Sales/purchase/credit/debit invoices        |
| invoice_line_items  | Individual line items on invoices           |
| payments            | Payment records linked to invoices          |
| tax_transactions    | GST (CGST/SGST/IGST) tax records           |

### Manufacturing

| Table               | Description                                |
|---------------------|---------------------------------------------|
| bill_of_materials   | BOM header (product recipe)                |
| bom_items           | Individual materials in a BOM              |
| job_orders          | Manufacturing job orders                   |
| job_order_items     | Material requirements for a job            |
| job_order_costs     | Cost tracking (labor, material, overhead)  |
| karigars            | Artisan/craftsman records                  |

### CRM

| Table               | Description                                |
|---------------------|---------------------------------------------|
| customers           | Customer profiles                          |
| customer_addresses  | Multiple addresses per customer            |
| communications      | Interaction/communication log              |
| loyalty_points      | Loyalty program point balances             |

## Key Relationships

```
tenant --< user --< sale
tenant --< location --< stock_item
product --< stock_item (one stock_item per product per location)
stock_item --< stock_movement
sale --< sale_line_item
sale --< sale_payment
sale --> customer (optional)
invoice --< invoice_line_item
invoice --< payment
invoice --< tax_transaction
journal_entry --< journal_entry_line --> account
bill_of_materials --< bom_item
job_order --> bill_of_materials
job_order --< job_order_item
```

## Money Storage Conventions

All monetary values are stored as **BigInt integers in the smallest currency unit**:

- INR: paise (1 rupee = 100 paise)
- USD: cents (1 dollar = 100 cents)
- AED: fils (1 dirham = 100 fils)

Column naming convention: suffix with `Paise` or `InSmallestUnit`.

Examples:
- `totalPaise BIGINT` -- total in paise
- `costPricePaise BIGINT` -- cost price in paise
- `metalRatePaise BIGINT` -- metal rate per gram in paise

**Never use DECIMAL or FLOAT for money.**

## Weight Storage Conventions

All weights are stored as **integers in milligrams** using BigInt.

Column naming convention: suffix with `Mg`.

Examples:
- `metalWeightMg BIGINT` -- metal weight in milligrams
- `grossWeightMg BIGINT` -- gross weight in milligrams
- `stoneWeightMg BIGINT` -- stone weight in milligrams

Conversion to display units (grams, tola, carat, troy oz) is done in the application layer using `WeightUtil`.

## Multi-Tenancy

Every tenant-scoped table includes:

```sql
tenant_id VARCHAR(36) NOT NULL
```

With a composite index:

```sql
INDEX idx_tenant_id (tenant_id)
-- or composite:
INDEX idx_tenant_created (tenant_id, created_at)
```

Prisma enforces this via the `TenantAwareService` base class, which adds `tenantId` to every query.

## ID Strategy

- All primary keys are UUID v4 strings stored as `VARCHAR(36)`
- Generated in the application layer using `uuid` package
- No auto-increment IDs (supports distributed systems)

## Indexing Strategy

- Every table has an index on `tenantId`
- Composite indexes on frequently queried combinations: `(tenantId, status)`, `(tenantId, createdAt)`
- Unique constraints on business keys: `(tenantId, email)` for users, `(tenantId, sku)` for products
- Foreign key indexes are created automatically by MySQL
- Full-text search is delegated to Meilisearch (not MySQL FULLTEXT)

## Prisma Schema Conventions

- Table names: `snake_case` via `@@map("table_name")`
- Column names: `snake_case` via `@map("column_name")`
- JSON fields use Prisma `Json` type
- Enums defined in `packages/shared-types` and referenced via `@map`
- Generator and datasource blocks only in `core.prisma`
- Each domain adds models in its own `.prisma` file
