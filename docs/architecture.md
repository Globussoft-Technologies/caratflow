# CaratFlow Architecture

## System Architecture

```
                                    +------------------+
                                    |   Load Balancer   |
                                    +--------+---------+
                                             |
                    +------------------------+------------------------+
                    |                                                 |
           +--------v---------+                            +---------v--------+
           |   Next.js Web    |                            |   NestJS API     |
           |   (Port 3000)    |                            |   (Port 4000)    |
           |                  |                            |                  |
           |  React 19        |     tRPC / REST            |  Modules:        |
           |  App Router      +--------------------------->+  - Inventory     |
           |  TanStack Query  |                            |  - Retail/POS    |
           |  Zustand         |                            |  - Financial     |
           |  shadcn/ui       |                            |  - Manufacturing |
           +------------------+                            |  - CRM           |
                                                           |  - Wholesale     |
                                                           |  - E-commerce    |
                                                           |  - Compliance    |
                                                           |  - Reporting     |
                                                           |  - Platform      |
                                                           +--------+---------+
                                                                    |
                    +-------+----------+----------+---------+-------+
                    |       |          |          |         |
              +-----v--+ +-v------+ +-v------+ +-v-----+ +-v--------+
              | MySQL 8 | | Redis  | | Meili  | | MinIO | | BullMQ   |
              | (Data)  | | (Cache)| | Search)| | (S3)  | | (Queues) |
              +--------+ +--------+ +--------+ +-------+ +----------+
```

## Tech Stack

| Layer        | Technology                  | Rationale                                                 |
|-------------|-----------------------------|------------------------------------------------------------|
| Monorepo    | Turborepo + pnpm workspaces | Fast incremental builds, dependency management             |
| Backend     | NestJS 11 + TypeScript 5.x  | Enterprise-grade DI, modular architecture, strict typing   |
| ORM         | Prisma 6 (MySQL)            | Type-safe queries, split schemas per domain, migrations    |
| API         | tRPC (internal) + REST      | tRPC for type-safe frontend-backend, REST for external     |
| Queue       | BullMQ on Redis             | Reliable async event processing, retries                   |
| Frontend    | Next.js 15 (App Router)     | Server components, streaming, React 19 features            |
| UI          | shadcn/ui + Tailwind + Radix| Accessible, customizable, consistent design                |
| State       | Zustand + TanStack Query    | Simple client state, powerful server state management      |
| Auth        | JWT + refresh tokens        | Stateless auth with rotation, RBAC                         |
| Search      | Meilisearch                 | Fast, typo-tolerant product search                         |
| Files       | S3-compatible (MinIO/AWS)   | Object storage for images, documents, invoices             |

## Monorepo Structure

```
CaratFlow/
  packages/
    db/                 Prisma schemas, client, seed scripts
    shared-types/       Zod schemas, TypeScript types, enums, domain events
    utils/              Money, Weight, Purity, Tax, Validators, Date helpers
    ui/                 Shared React components (shadcn/ui based)
  apps/
    api/                NestJS backend (all modules)
    web/                Next.js frontend
  docs/                 Documentation
  tests/                E2E tests
```

## Module Dependency Map

Each module is self-contained within its domain and communicates across boundaries only via the EventBus (BullMQ).

```
  +-------------+     +----------------+     +---------------+
  |  Inventory  |     |  Manufacturing |     |   Retail/POS  |
  +------+------+     +-------+--------+     +-------+-------+
         |                    |                      |
         |    Events          |    Events            |    Events
         v                    v                      v
  +------+--------------------+----------------------+-------+
  |                        EventBus (BullMQ)                 |
  +------+--------------------+----------------------+-------+
         |                    |                      |
         v                    v                      v
  +------+------+     +------+-------+     +---------+-----+
  |  Financial  |     |     CRM      |     |  Compliance   |
  +-------------+     +--------------+     +---------------+
```

**Import rules enforced across the codebase:**

- `packages/*` must not import from `apps/*`
- `apps/web` imports from any `packages/*`
- `apps/api` imports from `packages/db`, `packages/shared-types`, `packages/utils`
- Domain modules must not import directly from other domain modules
- Cross-domain communication uses the EventBus

## Data Flow: How a Sale Flows Through the System

```
1. POS (Retail Module)
   - Cashier creates sale with line items, discounts, payments
   - RetailPricingService calculates: metal_rate * weight + making + wastage + GST
   - Sale persisted in transaction (sale + line items + payments)

2. Event: retail.sale.completed
   |
   +---> Inventory Module
   |     - Decrements stock for each sold product
   |     - Creates stock movements (OUT)
   |     - Checks reorder levels
   |
   +---> Financial Module
   |     - Creates journal entries (debit: Cash/Bank, credit: Revenue)
   |     - Creates tax transactions (CGST, SGST, or IGST)
   |     - Updates accounts receivable if on credit
   |
   +---> CRM Module
   |     - Updates customer purchase history
   |     - Awards loyalty points
   |     - Triggers post-sale notifications
   |
   +---> Compliance Module
         - Records HUID for hallmarked items
         - Tracks TCS thresholds
         - Generates e-invoice data
```

## Event-Driven Architecture

CaratFlow uses an event-driven architecture for cross-module communication, powered by BullMQ on Redis.

**How events work:**

1. A module publishes a domain event via `EventBusService.publish(event)`
2. The event is placed on a BullMQ queue
3. Subscriber modules receive the event asynchronously
4. Each subscriber processes independently -- failure in one does not affect others
5. Failed events are retried with exponential backoff

**Event format:**

```typescript
interface DomainEvent {
  id: string;           // Unique event ID (UUID)
  tenantId: string;     // Tenant scope
  userId: string;       // User who triggered the action
  timestamp: string;    // ISO 8601 timestamp
  type: string;         // e.g., "retail.sale.completed"
  payload: unknown;     // Module-specific data
}
```

**Event types are defined in `packages/shared-types/src/events.ts`.**

## Multi-Tenancy Approach

CaratFlow is a multi-tenant SaaS application. Tenancy is enforced at every layer:

1. **Authentication**: JWT contains `tenantId`
2. **Middleware**: `TenantMiddleware` extracts and validates `tenantId` from JWT
3. **Service Layer**: `TenantAwareService` base class provides `tenantWhere()` helper
4. **Database**: Every tenant-scoped table has a `tenantId` column
5. **Queries**: All queries filter by `tenantId` -- no cross-tenant data leakage

Data isolation is row-level (shared database, shared schema). All tenant-scoped tables have a composite index on `(tenantId, ...)` for performance.
