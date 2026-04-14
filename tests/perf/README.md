# CaratFlow Performance Benchmarks

Lightweight HTTP load test suite built on [autocannon](https://github.com/mcollina/autocannon).
Targets the hot paths of the CaratFlow API and writes a Markdown report you can
commit alongside a release.

## What it covers

| Scenario                   | Endpoint                                      | Why it matters                              |
|----------------------------|-----------------------------------------------|---------------------------------------------|
| `auth.login`               | `POST /auth/login`                            | Login throughput + p95 latency              |
| `inventory.stock.list`     | `GET /trpc/inventory.stock.list`              | Paginated stock query                       |
| `retail.sale.create`       | `POST /trpc/retail.sale.create`               | POS sale create with 3 line items           |
| `financial.journal.create` | `POST /trpc/financial.journalEntry.create`    | Double-entry journal create                 |
| `reporting.sales.range`    | `GET /trpc/reporting.sales.summary`           | 30-day sales report aggregation             |
| `search.products`          | `GET /api/v1/store/search?q=gold`             | Meilisearch full-text search                |

> Note: most CaratFlow domain modules expose tRPC, not REST. The runner still
> measures the full HTTP pipeline (Nest -> guards -> middleware -> service ->
> Prisma) which is what production callers exercise.

## Prerequisites

1. Infra running: `docker-compose up -d`
2. API built and running in production mode:
   ```bash
   NODE_ENV=production pnpm --filter @caratflow/api start
   ```
3. Demo data seeded:
   ```bash
   pnpm db:push
   pnpm db:seed
   ```
   The seed creates the `demo` tenant and a tenant owner user
   (`owner@demo.caratflow.test` / `Demo@12345`). If you change the seed,
   override via env vars (see below).

## Running

From the repo root:

```bash
pnpm install                  # picks up autocannon devDependency
node tests/perf/run.mjs
```

Each scenario runs for 30 seconds with 10 concurrent connections (configurable).
A Markdown report lands in `tests/perf/results/YYYY-MM-DD.md`.

## Environment variables

| Variable            | Default                          | Purpose                                |
|---------------------|----------------------------------|----------------------------------------|
| `API_URL`           | `http://localhost:4000`          | Base URL of the API                    |
| `PERF_DURATION`     | `30`                             | Seconds per scenario                   |
| `PERF_CONNECTIONS`  | `10`                             | Concurrent connections                 |
| `PERF_EMAIL`        | `owner@demo.caratflow.test`      | Login user                             |
| `PERF_PASSWORD`     | `Demo@12345`                     | Login password                         |
| `PERF_TENANT`       | `demo`                           | Tenant slug                            |
| `PERF_SCENARIOS`    | (all)                            | Comma list, e.g. `auth.login,search.products` |

Examples:

```bash
# Quick smoke (5s, 5 conns)
PERF_DURATION=5 PERF_CONNECTIONS=5 node tests/perf/run.mjs

# Only auth + search
PERF_SCENARIOS=auth.login,search.products node tests/perf/run.mjs

# Hit a deployed environment
API_URL=https://caratflow.globusdemos.com PERF_TENANT=demo node tests/perf/run.mjs
```

## Reading the report

The summary table reports requests/sec (average), p50/p95/p99 latency, the 2xx
count, the non-2xx count, and socket errors. Mutation scenarios (`retail.sale.create`,
`financial.journal.create`) commonly produce non-2xx responses because the same
payload is replayed thousands of times and may collide with uniqueness or stock
constraints -- the latency numbers still reflect a realistic write path through
the framework, guards, validation and ORM.

## Suggested baselines (dev laptop, single API process)

These are not SLAs, just sanity floors to compare against:

- `auth.login`: > 200 req/s, p95 < 80 ms
- `inventory.stock.list`: > 400 req/s, p95 < 60 ms
- `search.products`: > 600 req/s, p95 < 40 ms
- `retail.sale.create`: > 80 req/s, p95 < 200 ms
- `financial.journal.create`: > 120 req/s, p95 < 150 ms
- `reporting.sales.range`: > 60 req/s, p95 < 250 ms

## Limitations

- Single host, no warm-up phase; first scenario may be a few percent slower.
- No graph / time-series output -- if you want trending, drop the JSON output
  branch into the runner and ship to Grafana.
- The runner does not seed data; if you wipe the DB you must re-seed.
