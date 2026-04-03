# CaratFlow - Development Guide

## Project Overview
CaratFlow is a multi-tenant jewelry ERP system built for Indian jewelers with worldwide support.

## Tech Stack
- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: NestJS 11 + TypeScript 5.x strict
- **ORM**: Prisma 6 with split schemas per domain (MySQL)
- **API**: tRPC (internal) + REST/Swagger (external)
- **Queue**: BullMQ on Redis
- **Frontend**: Next.js 15 (App Router) + React 19
- **UI**: shadcn/ui + Tailwind CSS + Radix primitives
- **State**: Zustand (client) + TanStack Query (server)
- **Auth**: Self-hosted JWT + refresh tokens, RBAC
- **Search**: Meilisearch
- **Files**: S3-compatible (MinIO dev, AWS S3 prod)

## Architecture

### Monorepo Structure
```
CaratFlow/
  packages/
    db/           -- Prisma schemas, client, seed
    shared-types/ -- Zod schemas, TS types, enums, domain events
    utils/        -- Money, Weight, Purity, Tax, Validators, Date helpers
    ui/           -- React components (shadcn/ui based)
  apps/
    api/          -- NestJS backend
    web/          -- Next.js frontend
```

### Module Boundaries
Each domain module owns its own:
- Prisma schema file in `packages/db/prisma/schema/{domain}.prisma`
- Types file in `packages/shared-types/src/{domain}.ts`
- NestJS module in `apps/api/src/modules/{domain}/`
- Frontend pages in `apps/web/app/(dashboard)/{domain}/`
- tRPC router merged into the root router

**Modules**: inventory, manufacturing, financial, retail, crm, wholesale, ecommerce, compliance, reporting, platform

### Import Rules
- `packages/*` MUST NOT import from `apps/*`
- `apps/web` can import from any `packages/*`
- `apps/api` can import from `packages/db`, `packages/shared-types`, `packages/utils`
- Domain modules MUST NOT import directly from other domain modules
- Cross-domain communication happens via the EventBus (BullMQ)
- Shared types go in `packages/shared-types`

## Coding Conventions

### TypeScript
- Strict mode everywhere
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `unknown` over `any`
- Use `as const` for literal arrays
- Export types explicitly with `export type` when only the type is needed

### Database / Prisma
- Database: **MySQL 8** (not PostgreSQL)
- All IDs are UUID v4 strings stored as `VARCHAR(36)`
- Every tenant-scoped table has `tenantId` field
- Table names: snake_case via `@@map("table_name")`
- Column names: snake_case via `@map("column_name")`
- JSON fields use Prisma's `Json` type (maps to MySQL JSON)
- Split schemas: each domain adds models to its own `.prisma` file
- The `generator` and `datasource` blocks only appear in `core.prisma`

### Money
- **Always stored as integers** in the smallest currency unit (paise, cents, fils)
- Use `BigInt` in Prisma for money fields (suffix: `Paise` or `InSmallestUnit`)
- Use `MoneyUtil` from `@caratflow/utils` for all arithmetic
- Never use floating-point for money calculations
- Currency code always accompanies amount

### Weights
- **Always stored as integers in milligrams**
- Use `BigInt` in Prisma for weight fields (suffix: `Mg`)
- Use `WeightUtil` from `@caratflow/utils` for conversions
- Display unit is user preference (g, tola, ct, troy oz)

### Multi-Tenancy
- `tenantId` extracted from JWT in TenantMiddleware
- Every database query MUST filter by `tenantId`
- Use `TenantAwareService` base class for services
- Never expose data across tenants

### API Design
- REST endpoints: `api/v1/{resource}` with Swagger docs
- tRPC endpoints: `/trpc/{router}.{procedure}`
- All responses follow `ApiResponse<T>` format: `{ success, data?, error?, meta? }`
- Pagination: `{ page, limit, sortBy, sortOrder }` -> `PaginatedResult<T>`
- Use Zod for validation in tRPC, class-validator in REST controllers

### Frontend
- Use App Router conventions (app/ directory)
- Server Components by default, `'use client'` only when needed
- tRPC for data fetching via TanStack Query
- Zustand for client-only UI state
- Components from `@caratflow/ui` package
- Follow the established page pattern: `PageHeader` + content

### Events
- Use `EventBusService.publish(event)` to emit domain events
- Subscribe with `EventBusService.subscribe(eventType, handler)`
- Event types defined in `packages/shared-types/src/events.ts`
- Events are processed asynchronously via BullMQ

### Git
- Never include AI attribution in commits
- Conventional commit messages: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`
- One feature per branch

## Quick Start
```bash
docker-compose up -d        # Start MySQL, Redis, Meilisearch, MinIO
cp .env.example .env        # Copy environment variables
pnpm install                # Install all dependencies
pnpm db:generate            # Generate Prisma client
pnpm db:push                # Push schema to database
pnpm db:seed                # Seed demo data
pnpm dev                    # Start all apps in development mode
```

## Key Constants
- India GST rate for jewelry: 3% (HSN 7113)
- Making charges GST: 5%
- Gold purity: 24K=999, 22K=916, 18K=750, 14K=585
- 1 tola = 11.664 grams
- 1 troy ounce = 31.1035 grams
- 1 carat = 200 milligrams
- Indian financial year: April 1 to March 31
- TDS 194Q threshold: Rs. 50 lakh
- TCS 206C threshold: Rs. 50 lakh
