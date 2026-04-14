# CaratFlow Module Map

Authoritative cross-reference of every domain module in CaratFlow: who owns
it, where its Prisma schema lives, what API surface it exposes, and which
frontend pages render it. Generated from the source tree -- if you add or
rename a module, update this file.

> **Owner types** are roles in the engineering team, not RBAC roles in the
> product. They tell you who to ping when something breaks.

## How modules are organised

Each domain module owns:

- **Prisma schema** -- one `*.prisma` file in `packages/db/prisma/schema/`.
- **Backend module** -- a NestJS module under `apps/api/src/modules/<domain>/`
  exposing tRPC procedures and (for public-facing surfaces) REST controllers.
- **Frontend pages** -- a folder under `apps/web/app/(dashboard)/<domain>/`
  using App Router conventions.
- **Shared types** -- Zod schemas + TS types in
  `packages/shared-types/src/<domain>.ts`.

Cross-domain communication goes through the `EventBusService` (BullMQ); modules
do not import each other directly.

---

## Wave 1 -- core ERP

### inventory

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Inventory squad                                                    |
| Prisma schema   | `packages/db/prisma/schema/inventory.prisma`                       |
| API module      | `apps/api/src/modules/inventory/`                                  |
| API surface     | tRPC: `inventory.stockItems.*`, `inventory.movements.*`, `inventory.transfers.*`, `inventory.stockTakes.*`, `inventory.metalStock.*`, `inventory.stoneStock.*`, `inventory.batchLots.*`, `inventory.serialNumbers.*`, `inventory.valuation.*` |
| Frontend pages  | `apps/web/app/(dashboard)/inventory/{items,metals,stones,movements,transfers,stock-takes,valuation}` |

### financial

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Finance squad                                                      |
| Prisma schema   | `packages/db/prisma/schema/financial.prisma`                       |
| API module      | `apps/api/src/modules/financial/`                                  |
| API surface     | tRPC: `financial.journalEntry.*`, `financial.bank.*`, `financial.tax.*`, `financial.reporting.*` |
| Frontend pages  | `apps/web/app/(dashboard)/finance/{journal,invoices,payments,bank,tax,rates,reports,schemes,girvi,bnpl}` |

### manufacturing

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Manufacturing squad                                                |
| Prisma schema   | `packages/db/prisma/schema/manufacturing.prisma`                   |
| API module      | `apps/api/src/modules/manufacturing/`                              |
| API surface     | tRPC: `manufacturing.bom.*`, `manufacturing.jobs.*`, `manufacturing.karigars.*`, `manufacturing.qc.*`, `manufacturing.planning.*` |
| Frontend pages  | `apps/web/app/(dashboard)/manufacturing/{bom,jobs,karigars,planning,qc}` |

### retail

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Retail squad                                                       |
| Prisma schema   | `packages/db/prisma/schema/retail.prisma`                          |
| API module      | `apps/api/src/modules/retail/`                                     |
| API surface     | tRPC: `retail.sale.*`, `retail.return.*`, `retail.discount.*`, `retail.oldGold.*`, `retail.layaway.*`, `retail.repair.*`, `retail.customOrder.*`, `retail.appraisal.*`, `retail.pricing.*` |
| Frontend pages  | `apps/web/app/(dashboard)/retail/{pos,sales,returns,old-gold,layaway,repairs,custom-orders,appraisals,discounts}` |

### crm

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | CRM squad                                                          |
| Prisma schema   | `packages/db/prisma/schema/crm.prisma`                             |
| API module      | `apps/api/src/modules/crm/`                                        |
| API surface     | tRPC: `crm.contacts.*`, `crm.loyalty.*`, `crm.campaigns.*`, `crm.segments.*` |
| Frontend pages  | `apps/web/app/(dashboard)/crm/`                                    |

### platform

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Platform squad                                                     |
| Prisma schema   | `packages/db/prisma/schema/platform.prisma` and `core.prisma`      |
| API module      | `apps/api/src/modules/platform/` plus `apps/api/src/auth/`         |
| API surface     | REST: `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /api/v1/b2c/auth/*`. tRPC: `platform.tenants.*`, `platform.users.*`, `platform.roles.*`, `platform.audit.*`. Health: `GET /health` |
| Frontend pages  | `apps/web/app/(dashboard)/settings/`, `apps/web/app/(auth)/`       |

---

## Wave 2 -- domain extensions

### wholesale

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Wholesale squad                                                    |
| Prisma schema   | `packages/db/prisma/schema/wholesale.prisma`                       |
| API module      | `apps/api/src/modules/wholesale/`                                  |
| API surface     | tRPC: `wholesale.b2bOrders.*`, `wholesale.priceLists.*`, `wholesale.quotes.*` |
| Frontend pages  | `apps/web/app/(dashboard)/wholesale/`                              |

### compliance

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Compliance squad                                                   |
| Prisma schema   | `packages/db/prisma/schema/compliance.prisma`, `referral-aml.prisma`|
| API module      | `apps/api/src/modules/compliance/`, `apps/api/src/modules/aml/`    |
| API surface     | tRPC: `compliance.kyc.*`, `compliance.bisHallmark.*`, `compliance.audit.*`, `aml.alerts.*` |
| Frontend pages  | `apps/web/app/(dashboard)/compliance/`                             |

### india (India-specific)

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | India squad                                                        |
| Prisma schema   | `packages/db/prisma/schema/india.prisma`                           |
| API module      | `apps/api/src/modules/india/`                                      |
| API surface     | tRPC: `india.gst.*`, `india.eInvoice.*`, `india.eWayBill.*`, `india.tdsTcs.*`, `india.gstr.*` |
| Frontend pages  | `apps/web/app/(dashboard)/finance/tax/`, embedded                  |

### reporting

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Reporting squad                                                    |
| Prisma schema   | `packages/db/prisma/schema/reporting.prisma`                       |
| API module      | `apps/api/src/modules/reporting/`                                  |
| API surface     | tRPC: `reporting.sales.*`, `reporting.inventory.*`, `reporting.crm.*`, `reporting.manufacturing.*`, `reporting.dashboard.*`, `reporting.forecast.*`, `reporting.custom.*` |
| Frontend pages  | `apps/web/app/(dashboard)/reports/`                                |

---

## Wave 3 -- channels

### ecommerce + storefront

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | E-commerce squad                                                   |
| Prisma schema   | `packages/db/prisma/schema/ecommerce.prisma`, `storefront.prisma`, `cms.prisma`, `b2c-features.prisma`, `digital-gold.prisma`, `preorder.prisma`, `bnpl.prisma`, `chatbot.prisma`, `ar.prisma`, `recommendations.prisma`, `referral-aml.prisma` |
| API module      | `apps/api/src/modules/ecommerce/`, `storefront/`, `cms/`, `b2c-features/`, `digital-gold/`, `preorder/`, `bnpl/`, `chatbot/`, `ar/`, `recommendations/`, `referral/`, `customer-portal/` |
| API surface     | REST: `GET/POST /api/v1/store/*` for the public storefront. Notable: `GET /api/v1/store/search`, `POST /api/v1/store/payments/*` (BNPL), `GET /api/v1/store/cms/*`, `POST /api/v1/store/chat/*`, `GET /api/v1/store/ar/*`, `POST /api/v1/store/digital-gold/*`, `GET /api/v1/store/account/*` (customer portal), `POST /api/v1/store/referral/*`, `GET /api/v1/store/recommendations/*` |
| Frontend pages  | `apps/web/app/(dashboard)/ecommerce/`, `apps/web/app/(dashboard)/cms/`. Public storefront is a separate Next.js surface (when present). |

### export

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Export squad                                                       |
| Prisma schema   | `packages/db/prisma/schema/export.prisma`                          |
| API module      | `apps/api/src/modules/export/`                                     |
| API surface     | tRPC: `export.shipments.*`, `export.invoices.*`, `export.lut.*`    |
| Frontend pages  | `apps/web/app/(dashboard)/export/`                                 |

### search

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Search squad                                                       |
| Prisma schema   | `packages/db/prisma/schema/search.prisma`                          |
| API module      | `apps/api/src/modules/search/`                                     |
| API surface     | REST: `GET /api/v1/store/search`. tRPC: `search.index.*`, `search.synonym.*`, `search.analytics.*` |
| Frontend pages  | Embedded in inventory + storefront pages; admin tools under `apps/web/app/(dashboard)/settings/search/` |

---

## Wave 4 -- hardening

### hardware (W4-INTEG)

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | Integrations squad                                                 |
| Prisma schema   | (configuration only -- piggybacks on `platform.prisma`)            |
| API module      | `apps/api/src/modules/hardware/`                                   |
| API surface     | tRPC: `hardware.devices.*`, `hardware.rfid.*`, `hardware.scale.*`, `hardware.printer.*`, `hardware.scanner.*` |
| Frontend pages  | `apps/web/app/(dashboard)/settings/hardware/`                      |

### testing & docs (W4-QA)

| Field           | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Owner type      | QA squad                                                           |
| Prisma schema   | n/a                                                                |
| API module      | n/a                                                                |
| Test surface    | `tests/e2e/`, `tests/playwright/`, `tests/perf/`                   |
| Docs            | `docs/*.md`                                                        |

---

## Quick lookup -- file -> module

| Prisma file                                     | Domain         |
|-------------------------------------------------|----------------|
| `core.prisma`                                   | platform       |
| `platform.prisma`                               | platform       |
| `inventory.prisma`                              | inventory      |
| `financial.prisma`                              | financial      |
| `manufacturing.prisma`                          | manufacturing  |
| `retail.prisma`                                 | retail         |
| `crm.prisma`                                    | crm            |
| `wholesale.prisma`                              | wholesale      |
| `compliance.prisma`                             | compliance     |
| `referral-aml.prisma`                           | compliance/aml |
| `india.prisma`                                  | india          |
| `reporting.prisma`                              | reporting      |
| `ecommerce.prisma`                              | ecommerce      |
| `storefront.prisma`                             | ecommerce      |
| `cms.prisma`                                    | ecommerce      |
| `b2c-features.prisma`                           | ecommerce      |
| `digital-gold.prisma`                           | ecommerce      |
| `preorder.prisma`                               | ecommerce      |
| `bnpl.prisma`                                   | ecommerce      |
| `chatbot.prisma`                                | ecommerce      |
| `ar.prisma`                                     | ecommerce      |
| `recommendations.prisma`                        | ecommerce      |
| `export.prisma`                                 | export         |
| `search.prisma`                                 | search         |

## Cross-cutting packages

| Package                   | Purpose                                                |
|---------------------------|--------------------------------------------------------|
| `packages/db`             | Prisma client, schemas, seed                           |
| `packages/shared-types`   | Zod schemas, TS types, enums, domain events            |
| `packages/utils`          | Money, Weight, Purity, Tax, validators, dates          |
| `packages/ui`             | shadcn/ui-based React components                       |
