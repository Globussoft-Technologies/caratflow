#!/usr/bin/env node
/**
 * CaratFlow performance benchmark runner.
 *
 * Runs a fixed set of HTTP scenarios against a running API instance using
 * autocannon and writes a markdown report to tests/perf/results/<date>.md.
 *
 * Usage:
 *   node tests/perf/run.mjs
 *
 * Environment variables:
 *   API_URL           Base URL of the API     (default http://localhost:4000)
 *   PERF_DURATION     Seconds per scenario    (default 30)
 *   PERF_CONNECTIONS  Concurrent connections  (default 10)
 *   PERF_EMAIL        Login email             (default owner@demo.caratflow.test)
 *   PERF_PASSWORD     Login password          (default Demo@12345)
 *   PERF_TENANT       Tenant slug             (default demo)
 *   PERF_SCENARIOS    Comma list to filter    (default all)
 *
 * The runner first performs a real login to obtain a JWT, then injects the
 * Authorization header into every authenticated scenario. It does NOT seed
 * data -- see README.md for how to prepare the database.
 */

import autocannon from 'autocannon';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const DURATION = Number(process.env.PERF_DURATION ?? 30);
const CONNECTIONS = Number(process.env.PERF_CONNECTIONS ?? 10);
const EMAIL = process.env.PERF_EMAIL ?? 'owner@demo.caratflow.test';
const PASSWORD = process.env.PERF_PASSWORD ?? 'Demo@12345';
const TENANT = process.env.PERF_TENANT ?? 'demo';
const FILTER = (process.env.PERF_SCENARIOS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

/** Fetch a JWT for an authenticated user. */
async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, tenantSlug: TENANT }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): set PERF_EMAIL/PERF_PASSWORD/PERF_TENANT or seed demo data first`);
  }
  const json = await res.json();
  const token = json?.data?.accessToken ?? json?.data?.token ?? json?.accessToken;
  if (!token) throw new Error('Login response missing accessToken');
  return token;
}

/** Build the tRPC GET URL for a query procedure. */
function trpcGet(path, input) {
  const encoded = encodeURIComponent(JSON.stringify(input ?? {}));
  return `/trpc/${path}?input=${encoded}`;
}

/** Build the tRPC POST body for a mutation procedure. */
function trpcPost(input) {
  return JSON.stringify(input ?? {});
}

function buildScenarios(token) {
  const authHeaders = {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
    'x-tenant-slug': TENANT,
  };
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  return [
    {
      name: 'auth.login',
      description: 'POST /auth/login -- credential exchange + JWT issue',
      url: '/auth/login',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, tenantSlug: TENANT }),
      authenticated: false,
    },
    {
      name: 'inventory.stock.list',
      description: 'GET inventory.stock.list (tRPC) -- paginated stock query',
      url: trpcGet('inventory.stock.list', { page: 1, limit: 25 }),
      method: 'GET',
      headers: authHeaders,
      authenticated: true,
    },
    {
      name: 'retail.sale.create',
      description: 'POST retail.sale.create (tRPC) -- 3 line items, cash tender',
      url: '/trpc/retail.sale.create',
      method: 'POST',
      headers: authHeaders,
      body: trpcPost({
        channel: 'POS',
        customerId: null,
        lines: [
          { sku: 'PERF-RING-22K-001', qty: 1, weightMg: 5000, ratePerGramPaise: 650000 },
          { sku: 'PERF-CHAIN-22K-002', qty: 1, weightMg: 12000, ratePerGramPaise: 650000 },
          { sku: 'PERF-EARRING-18K-003', qty: 2, weightMg: 3000, ratePerGramPaise: 530000 },
        ],
        payments: [{ mode: 'CASH', amountPaise: 100000000 }],
      }),
      authenticated: true,
      expectErrors: true,
    },
    {
      name: 'financial.journal.create',
      description: 'POST financial.journalEntry.create (tRPC) -- balanced double entry',
      url: '/trpc/financial.journalEntry.create',
      method: 'POST',
      headers: authHeaders,
      body: trpcPost({
        date: today,
        narration: 'Perf benchmark journal',
        lines: [
          { accountCode: '1000', debitPaise: 50000, creditPaise: 0 },
          { accountCode: '4000', debitPaise: 0, creditPaise: 50000 },
        ],
      }),
      authenticated: true,
      expectErrors: true,
    },
    {
      name: 'reporting.sales.range',
      description: 'GET reporting.sales.summary (tRPC) -- 30 day sales report',
      url: trpcGet('reporting.sales.summary', { from: monthAgo, to: today }),
      method: 'GET',
      headers: authHeaders,
      authenticated: true,
    },
    {
      name: 'search.products',
      description: 'GET /api/v1/store/search?q=gold -- Meilisearch full text',
      url: '/api/v1/store/search?q=gold&page=1&limit=20',
      method: 'GET',
      headers: { 'x-tenant-slug': TENANT },
      authenticated: false,
    },
  ];
}

async function runScenario(scenario) {
  process.stdout.write(`-- ${scenario.name} ... `);
  const result = await autocannon({
    url: `${API_URL}${scenario.url}`,
    method: scenario.method,
    headers: scenario.headers,
    body: scenario.body,
    connections: CONNECTIONS,
    duration: DURATION,
    // Treat 4xx as non-error so create-mutation scenarios that hit validation
    // still produce throughput numbers. Real errors (5xx, timeouts) still count.
    expectBody: undefined,
  });
  process.stdout.write(`done (${Math.round(result.requests.average)} req/s)\n`);
  return { scenario, result };
}

function fmtMs(n) {
  if (n == null || Number.isNaN(n)) return '-';
  return `${n.toFixed(2)} ms`;
}

function renderReport(runs) {
  const date = new Date().toISOString();
  const lines = [];
  lines.push(`# CaratFlow Performance Benchmarks`);
  lines.push('');
  lines.push(`- Generated: ${date}`);
  lines.push(`- API target: \`${API_URL}\``);
  lines.push(`- Duration per scenario: ${DURATION}s`);
  lines.push(`- Concurrent connections: ${CONNECTIONS}`);
  lines.push(`- Tool: [autocannon](https://github.com/mcollina/autocannon)`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Scenario | Req/s (avg) | p50 | p95 | p99 | 2xx | non-2xx | Errors |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const { scenario, result } of runs) {
    const reqAvg = result.requests.average.toFixed(1);
    const p50 = fmtMs(result.latency.p50);
    const p95 = fmtMs(result.latency.p97_5 ?? result.latency.p95);
    const p99 = fmtMs(result.latency.p99);
    const ok = result['2xx'] ?? 0;
    const non2xx = result.non2xx ?? 0;
    const errors = result.errors ?? 0;
    lines.push(`| ${scenario.name} | ${reqAvg} | ${p50} | ${p95} | ${p99} | ${ok} | ${non2xx} | ${errors} |`);
  }
  lines.push('');
  lines.push('## Scenario detail');
  lines.push('');
  for (const { scenario, result } of runs) {
    lines.push(`### ${scenario.name}`);
    lines.push('');
    lines.push(`> ${scenario.description}`);
    lines.push('');
    lines.push('```');
    lines.push(`${scenario.method} ${scenario.url}`);
    lines.push('```');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|---|---|');
    lines.push(`| Requests/sec (avg) | ${result.requests.average.toFixed(2)} |`);
    lines.push(`| Requests/sec (stddev) | ${result.requests.stddev?.toFixed?.(2) ?? '-'} |`);
    lines.push(`| Latency p50 | ${fmtMs(result.latency.p50)} |`);
    lines.push(`| Latency p90 | ${fmtMs(result.latency.p90)} |`);
    lines.push(`| Latency p95 | ${fmtMs(result.latency.p97_5 ?? result.latency.p95)} |`);
    lines.push(`| Latency p99 | ${fmtMs(result.latency.p99)} |`);
    lines.push(`| Latency max | ${fmtMs(result.latency.max)} |`);
    lines.push(`| Throughput (bytes/s avg) | ${result.throughput.average.toFixed(0)} |`);
    lines.push(`| Total requests | ${result.requests.total ?? '-'} |`);
    lines.push(`| 2xx | ${result['2xx'] ?? 0} |`);
    lines.push(`| non-2xx | ${result.non2xx ?? 0} |`);
    lines.push(`| Errors (timeouts/socket) | ${result.errors ?? 0} |`);
    lines.push('');
  }
  lines.push('## Notes');
  lines.push('');
  lines.push('- non-2xx responses on create scenarios usually indicate validation hits because');
  lines.push('  benchmarks reuse the same payload thousands of times. Throughput and latency');
  lines.push('  numbers are still meaningful for the request pipeline.');
  lines.push('- Run the API in production mode (`NODE_ENV=production`) to get realistic numbers.');
  lines.push('- Numbers are machine-dependent. Track deltas between runs, not absolutes.');
  return lines.join('\n');
}

async function main() {
  console.log(`CaratFlow perf runner -> ${API_URL}`);
  console.log(`  duration=${DURATION}s connections=${CONNECTIONS}`);

  let token;
  try {
    token = await login();
    console.log('  login: ok');
  } catch (err) {
    console.warn(`  login: FAILED -- ${err.message}`);
    console.warn('  authenticated scenarios will be skipped');
    token = null;
  }

  const all = buildScenarios(token ?? '');
  const scenarios = all.filter((s) => {
    if (FILTER.length && !FILTER.includes(s.name)) return false;
    if (s.authenticated && !token) return false;
    return true;
  });

  const runs = [];
  for (const scenario of scenarios) {
    try {
      runs.push(await runScenario(scenario));
    } catch (err) {
      console.error(`  ${scenario.name}: ${err.message}`);
    }
  }

  const report = renderReport(runs);
  const date = new Date().toISOString().slice(0, 10);
  const outDir = resolve(__dirname, 'results');
  await mkdir(outDir, { recursive: true });
  const outFile = resolve(outDir, `${date}.md`);
  await writeFile(outFile, report, 'utf8');
  console.log(`\nReport written to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
