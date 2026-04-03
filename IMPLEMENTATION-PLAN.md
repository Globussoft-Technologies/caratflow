# CaratFlow - Parallel Implementation Plan

## 16 Agents | 5 Waves | 250+ Features

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | NestJS 11 + TypeScript 5.x (strict) | Module boundaries enforced by framework, DI, REST + tRPC + WebSocket |
| **ORM** | Prisma 6 (split schemas per domain) | Type-safe, schema-as-code, parallel schema development |
| **Frontend** | Next.js 15 (App Router) + React 19 | SSR, App Router, modern React |
| **UI** | shadcn/ui + Tailwind CSS 4 | Production-grade, customizable, no vendor lock |
| **State** | Zustand (client) + TanStack Query (server) | Lightweight, type-safe |
| **Tables** | TanStack Table | Critical for ERP data grids |
| **Charts** | Recharts | Dashboard visualizations |
| **API (internal)** | tRPC | End-to-end type safety, no codegen |
| **API (external)** | REST + OpenAPI/Swagger | For Shopify, Tally, external integrations |
| **Database** | PostgreSQL 17 | JSONB, NUMERIC precision, row-level security |
| **Cache/Queue** | Redis 7 + BullMQ | Sessions, rate caching, async jobs |
| **Search** | Meilisearch | Product catalog, customer lookup |
| **Auth** | Better Auth (self-hosted) | RBAC with custom permission matrix |
| **Files** | S3-compatible (MinIO / AWS S3) | Image storage, documents |
| **Mobile** | React Native + Expo | Code sharing with web |
| **Monorepo** | Turborepo + pnpm workspaces | Parallel builds, shared packages |
| **Testing** | Vitest + Playwright + Supertest | Unit, E2E, API integration |
| **Containers** | Docker + Docker Compose (dev), K8s (prod) | Consistent environments |

---

## Monorepo Structure

```
CaratFlow/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml
├── .github/workflows/
│
├── packages/
│   ├── db/                         # Prisma schema, migrations, client
│   │   └── prisma/schema/
│   │       ├── core.prisma         # Tenant, User, Customer, Supplier, Product, Location, Account
│   │       ├── inventory.prisma
│   │       ├── manufacturing.prisma
│   │       ├── financial.prisma
│   │       ├── retail.prisma
│   │       ├── crm.prisma
│   │       ├── wholesale.prisma
│   │       ├── compliance.prisma
│   │       └── ecommerce.prisma
│   ├── shared-types/               # Zod schemas, TS types, enums, domain events
│   ├── ui/                         # Shared shadcn/ui component library
│   ├── utils/                      # Money, weight, purity, tax helpers
│   └── api-client/                 # Generated tRPC client
│
├── apps/
│   ├── api/                        # NestJS backend
│   │   └── src/modules/
│   │       ├── auth/
│   │       ├── inventory/
│   │       ├── manufacturing/
│   │       ├── retail/
│   │       ├── financial/
│   │       ├── crm/
│   │       ├── wholesale/
│   │       ├── ecommerce/
│   │       ├── compliance/
│   │       ├── reporting/
│   │       └── platform/
│   ├── web/                        # Next.js frontend
│   │   └── src/app/
│   │       ├── (auth)/
│   │       ├── (dashboard)/
│   │       ├── inventory/
│   │       ├── manufacturing/
│   │       ├── retail/
│   │       ├── finance/
│   │       ├── crm/
│   │       ├── wholesale/
│   │       ├── ecommerce/
│   │       ├── compliance/
│   │       ├── reports/
│   │       └── settings/
│   └── mobile/                     # React Native / Expo
│
├── tools/
│   ├── seed/                       # Database seeders
│   └── scripts/                    # Code generation, utilities
└── docs/
```

---

## How Agents Avoid Conflicts

### 1. Database Schema Ownership
Each domain owns its own `.prisma` file. Cross-domain references use foreign keys to **anchor tables** in `core.prisma` (Tenant, User, Customer, Supplier, Product, Location, Account). No agent modifies another's schema file.

### 2. Typed Event Bus
Modules communicate via async events (BullMQ). Wave 0 defines the full event catalog in `shared-types/src/events.ts`. Each agent publishes events for their state changes and subscribes to events from other domains. No cross-module code imports.

### 3. tRPC Router Namespacing
Each module exports its own tRPC router. Aggregation in one merge file (one line per module). Each agent only touches their own router.

### 4. File System Boundaries
Each agent gets an explicit list of directories they own. No agent touches another agent's directories.

---

## Key Design Decisions

- **Multi-tenant from day one** -- `tenantId` on every table, extracted from JWT
- **Money stored as integers (paise)** -- no floating-point rounding errors
- **Weights stored as integers (milligrams)** -- precision critical for jewelry
- **UTC timestamps everywhere** -- display timezone conversion in frontend
- **Domain events for all cross-module communication** -- zero coupling between modules
- **Split Prisma schemas** -- parallel schema development without merge conflicts

---

## Wave Plan

### WAVE 0: Foundation (1 Agent, runs first)

| Agent | What It Builds |
|-------|---------------|
| **F0: Foundation** | Monorepo scaffold, Prisma + core schema (all anchor entities), shared-types (Zod, events, common types), utils (money, weight, purity, tax), UI library (shadcn + layout shell), NestJS API (auth, RBAC, tRPC stubs, BullMQ, event dispatcher), Next.js frontend (auth pages, dashboard shell, sidebar nav), Docker Compose (Postgres, Redis, Meilisearch, MinIO), seed script, CI pipeline |

**Output:** Bootable system with login, empty dashboard, all module stubs ready.

---

### WAVE 1: Core Domains (6 Agents in Parallel)

| Agent | Module | Features | Key Capabilities |
|-------|--------|----------|-----------------|
| **W1-INV** | Inventory | 25 | Metal/stone/finished goods tracking, karat-wise inventory, 5 valuation methods, batch/lot/serial, RFID/barcode, multi-location, metal recovery |
| **W1-FIN** | Financial | 34 | Chart of Accounts, GL (double-entry), AP/AR, GST engine (CGST/SGST/IGST), TDS/TCS, e-Invoice, e-Way Bill, bank recon, multi-currency, P&L/BS/Trial Balance, margin enforcement |
| **W1-MFG** | Manufacturing | 27 | BOM engine, MRP, PPC, job orders, job costing, karigar management (tasks, wages, metal balance), WIP monitoring, QC checkpoints, tunch/wastage, assembly/disassembly |
| **W1-RET** | Retail/POS | 21 | POS (touch-optimized), weighing scale integration, invoicing (images, HUID, specs), layaway, repairs, custom orders, old gold buying, appraisals, returns, discounts, label printing |
| **W1-CRM** | CRM | 17 | Customer 360, purchase history, loyalty engine (points/tiers), digital passbook, WhatsApp/SMS/email notifications, birthday reminders, campaigns, leads, feedback |
| **W1-PLAT** | Platform | 25 | RBAC (roles/permissions/field-level), user management, multi-branch, real-time sync (WebSocket), data import/export (Excel/CSV), audit trail, multi-language, multi-company, file uploads, PDF generation |

---

### WAVE 2: Secondary Domains (4 Agents in Parallel)

| Agent | Module | Features | Dependencies |
|-------|--------|----------|-------------|
| **W2-WHL** | Wholesale | 13 | Wholesale billing, consignment (in/out), memo management, supplier management, POs, agent commissions, credit limits | W1-INV, W1-FIN |
| **W2-COMP** | Compliance | 9+ | HUID management, hallmark tracking, gemstone certificates, lot traceability, Kimberley Process, conflict-free sourcing, insurance integration | W1-INV, W1-RET |
| **W2-IND** | India-Specific | 16 | Girvi/mortgage (KYC, interest calc, EMI, auction), kitty/chit schemes, gold savings schemes, UPI integration, NEFT/RTGS/IMPS, Aadhaar eKYC, PAN verification, MCX live rates, old gold melting workflow, bullion dealer integration | W1-FIN, W1-CRM |
| **W2-RPT** | Reporting | 19 | Dashboard engine (configurable widgets), sales/stock/margin/profitability reports, demand forecasting, reorder calculation, custom report builder, scheduled delivery, tax reports, audit reports | W1-INV, W1-FIN, W1-RET, W1-MFG, W1-CRM |

---

### WAVE 3: Integrations & Mobile (3 Agents in Parallel)

| Agent | Module | Features | Dependencies |
|-------|--------|----------|-------------|
| **W3-ECOM** | E-Commerce | 12 | Catalog sync, Shopify integration, marketplace adapters (Amazon/Flipkart), payment gateways (Razorpay/PayU/Stripe), shipping (Shiprocket/Delhivery), omnichannel orders, click-and-collect, live rate display, virtual try-on | W1-INV, W1-RET, W1-FIN |
| **W3-EXP** | Export | 7 | Export invoicing, multi-currency invoicing, customs/duty calc, export docs (packing list, shipping bill, CoO, ARE forms), country-specific compliance, DGFT integration | W1-FIN, W2-WHL, W2-COMP |
| **W3-MOB** | Mobile Apps | 4 apps | Owner app (KPIs, approvals), Sales app (billing, barcode, stock check), Customer app (passbook, loyalty, schemes, catalog), Agent app (collections, visits, orders) -- all using existing APIs | All W1 + W2 APIs |

---

### WAVE 4: Hardening (2 Agents in Parallel)

| Agent | Module | What It Builds | Dependencies |
|-------|--------|---------------|-------------|
| **W4-INTEG** | Hardware | RFID reader integration, barcode scanner, weighing scale (serial/USB HID), customer-facing display, label printer, biometric attendance | W1-INV, W1-RET, W1-PLAT |
| **W4-QA** | Testing & Docs | E2E test suites (Playwright), API integration tests, performance benchmarks, user documentation, API docs, deployment guide | All prior waves |

---

## Dependency Graph

```
                              [F0: Foundation]
                                     |
                 ┌─────────┬─────────┼─────────┬─────────┬─────────┐
                 v         v         v         v         v         v
            [W1-INV]  [W1-FIN]  [W1-MFG]  [W1-RET]  [W1-CRM]  [W1-PLAT]
                 |         |         |         |         |         |
                 └────┬────┴────┬────┴────┬────┴────┬────┘         |
                      v         v         v         v              |
                 [W2-WHL]  [W2-COMP]  [W2-IND]  [W2-RPT]          |
                      |         |         |         |              |
                      └────┬────┴────┬────┘         |              |
                           v         v              v              v
                      [W3-ECOM]  [W3-EXP]      [W3-MOB] ◄─────────┘
                           |         |              |
                           └────┬────┴──────────────┘
                                v
                        [W4-INTEG]  [W4-QA]
```

---

## Agent Summary

| # | Agent ID | Wave | Module | Complexity | Frontend Pages | Parallel With |
|---|----------|------|--------|-----------|---------------|---------------|
| 1 | F0 | 0 | Foundation | High | Auth + shell | None (first) |
| 2 | W1-INV | 1 | Inventory | Very High | ~12 pages | W1-FIN, W1-MFG, W1-RET, W1-CRM, W1-PLAT |
| 3 | W1-FIN | 1 | Financial | Very High | ~15 pages | W1-INV, W1-MFG, W1-RET, W1-CRM, W1-PLAT |
| 4 | W1-MFG | 1 | Manufacturing | Very High | ~10 pages | W1-INV, W1-FIN, W1-RET, W1-CRM, W1-PLAT |
| 5 | W1-RET | 1 | Retail/POS | High | ~10 pages | W1-INV, W1-FIN, W1-MFG, W1-CRM, W1-PLAT |
| 6 | W1-CRM | 1 | CRM | Medium | ~8 pages | W1-INV, W1-FIN, W1-MFG, W1-RET, W1-PLAT |
| 7 | W1-PLAT | 1 | Platform | High | ~8 pages | W1-INV, W1-FIN, W1-MFG, W1-RET, W1-CRM |
| 8 | W2-WHL | 2 | Wholesale | Medium-High | ~7 pages | W2-COMP, W2-IND, W2-RPT |
| 9 | W2-COMP | 2 | Compliance | Medium | ~5 pages | W2-WHL, W2-IND, W2-RPT |
| 10 | W2-IND | 2 | India-Specific | High | ~8 pages | W2-WHL, W2-COMP, W2-RPT |
| 11 | W2-RPT | 2 | Reporting | High | ~12 pages | W2-WHL, W2-COMP, W2-IND |
| 12 | W3-ECOM | 3 | E-Commerce | Medium-High | ~6 pages | W3-EXP, W3-MOB |
| 13 | W3-EXP | 3 | Export | Medium | ~5 pages | W3-ECOM, W3-MOB |
| 14 | W3-MOB | 3 | Mobile | High | 4 apps | W3-ECOM, W3-EXP |
| 15 | W4-INTEG | 4 | Hardware | Medium | Config UIs | W4-QA |
| 16 | W4-QA | 4 | Testing/Docs | Medium | -- | W4-INTEG |

---

## Agent Instruction Template

Each agent receives these rules:

```
YOUR DIRECTORIES (only modify these):
- apps/api/src/modules/[module]/
- apps/web/src/app/[module]/
- apps/web/src/features/[module]/
- packages/db/prisma/schema/[module].prisma
- packages/shared-types/src/[module].ts

IMPORT RULES:
- OK: @caratflow/db, @caratflow/shared-types, @caratflow/ui, @caratflow/utils
- OK: NestJS core, third-party npm packages
- NEVER: ../other-module/ or any cross-module import

CONVENTIONS:
- All money as integer (paise). Use Money type from @caratflow/utils
- All weights as integer (milligrams). Use Weight type from @caratflow/utils
- All DB tables include: id (UUID), tenantId, createdAt, updatedAt, createdBy, updatedBy
- Use NestJS guards: @RequirePermission('module.resource.action')
- Publish domain events for all state changes via EventBus service
- Write unit tests for all service methods
- Write API integration tests for all endpoints
```

---

## Execution Order

1. **Run F0** (foundation) -- must complete fully
2. **Run W1-INV, W1-FIN, W1-MFG, W1-RET, W1-CRM, W1-PLAT** -- all 6 in parallel
3. **Run W2-WHL, W2-COMP, W2-IND, W2-RPT** -- all 4 in parallel
4. **Run W3-ECOM, W3-EXP, W3-MOB** -- all 3 in parallel
5. **Run W4-INTEG, W4-QA** -- both in parallel

**Maximum concurrent agents: 6 (Wave 1)**
**Total agents: 16**
**Total waves: 5 (0-4)**
