# CaratFlow - Bug Report from Test Suite

**Date:** 2026-04-07
**Server:** 163.227.174.141 (caratflow.globusdemos.com)
**Node:** v20.20.1 | **Vitest:** v2.1.9

## Test Results Summary

```
Utility Tests:    594 passed / 594 total  (100%)
API Unit Tests:  1636 passed / 1643 total (99.6%)  -- 7 FAILED
Integration Tests: ALL FAILED (9 files)   -- Prisma client not generated
E2E Tests:        NOT RUN YET             -- depends on running API
```

---

## Category 1: Integration Tests -- Prisma Client Not Generated (9 files, ~140 tests)

**Root Cause:** `@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.`

The integration tests import the actual NestJS AppModule which requires a generated Prisma client. The server has the code but `prisma generate` hasn't been run yet.

**Fix:** Run `pnpm db:generate` on the server before running integration tests.

**Affected files:**
- `src/__tests__/auth.integration.test.ts`
- `src/__tests__/b2c-features.integration.test.ts`
- `src/__tests__/chatbot.integration.test.ts`
- `src/__tests__/cms.integration.test.ts`
- `src/__tests__/customer-portal.integration.test.ts`
- `src/__tests__/digital-gold.integration.test.ts`
- `src/__tests__/health.integration.test.ts`
- `src/__tests__/search.integration.test.ts`
- `src/__tests__/storefront.integration.test.ts`

---

## Category 2: Unit Test Failures (7 tests)

### Bug 1: Manufacturing -- Invalid job status transition QC_FAILED -> IN_PROGRESS
**File:** `src/modules/manufacturing/manufacturing.service.spec.ts`
**Test:** `allows QC_FAILED -> IN_PROGRESS (rework)`
**Error:** `expected false to be true`
**Analysis:** The test expects QC_FAILED -> IN_PROGRESS to be a valid transition (rework scenario), but the service's state machine doesn't include this transition. Either the service needs to add this transition, or the test expectation is wrong.
**Likely fix:** Add `QC_FAILED -> IN_PROGRESS` to the JOB_ORDER_TRANSITIONS map in the manufacturing service (rework is a valid business scenario).

### Bug 2: Manufacturing -- Invalid job status transition PLANNED -> MATERIAL_ISSUED
**File:** `src/modules/manufacturing/manufacturing.service.spec.ts`
**Test:** `allows valid transition: PLANNED -> MATERIAL_ISSUED`
**Error:** State transition not allowed
**Analysis:** The test expects PLANNED -> MATERIAL_ISSUED to be valid, but the service may not include this transition. This is a valid business flow (issuing materials for a planned job).
**Likely fix:** Verify the state machine includes PLANNED -> MATERIAL_ISSUED, add if missing.

### Bug 3: E-Commerce -- createOrder mock returns undefined
**File:** `src/modules/ecommerce/__tests__/ecommerce.service.spec.ts`
**Test:** `creates an online order with items and publishes event`
**Error:** `NotFoundException: Online order not found`
**Analysis:** The test mocks `onlineOrder.create` but the service calls `getOrder()` after creation which calls `findUnique` -- that mock isn't set up to return the created order.
**Likely fix:** Add `mockPrisma.onlineOrder.findUnique.mockResolvedValue(createdOrder)` after the create mock in the test.

### Bug 4: Platform Import -- processImport returns COMPLETED instead of FAILED
**File:** `src/modules/platform/__tests__/platform.import.service.spec.ts`
**Test:** `returns FAILED status when all rows have errors`
**Error:** `expected 'COMPLETED' to be 'FAILED'`
**Analysis:** The service marks import as COMPLETED even when all rows fail validation. It should check if successRows === 0 and mark as FAILED.
**Likely fix:** In `platform.import.service.ts`, after processing all rows, if `successRows === 0 && errorRows > 0`, set status to `FAILED` instead of `COMPLETED`.

### Bug 5: Platform Role -- Wildcard permission check returns false
**File:** `src/modules/platform/__tests__/platform.role.service.spec.ts`
**Test:** `returns true for wildcard * permission`
**Error:** `expected false to be true`
**Analysis:** The `checkPermission` method doesn't handle the wildcard `*` permission correctly. When a role has `["*"]` in its permissions, it should grant access to any permission.
**Likely fix:** In `platform.role.service.ts`, in `checkPermission()`, check if the permissions array contains `"*"` and return true immediately.

### Bug 6: Recommendations -- Fallback uses trending instead of newest
**File:** `src/modules/recommendations/__tests__/recommendations.service.spec.ts`
**Test:** `should fall back to trending when no behavior`
**Error:** `expected 'fallback-trending' to be 'fallback-newest'`
**Analysis:** The test name says "fall back to trending" but expects "fallback-newest". Either the test name or the expected value is wrong. If no behavior exists, the service falls back to trending products (which is the correct behavior).
**Likely fix:** Update the test to expect `'fallback-trending'` instead of `'fallback-newest'`, or rename the test.

### Bug 7: Reporting Custom -- $queryRaw not mocked
**File:** `src/modules/reporting/__tests__/reporting.custom.service.spec.ts`
**Test:** `executes a query and returns results`
**Error:** `TypeError: Cannot read properties of undefined (reading 'mockResolvedValue')`
**Analysis:** The mock Prisma service doesn't include `$queryRaw` as a mock function. The custom report service uses raw SQL queries which need this method.
**Likely fix:** Add `$queryRaw: vi.fn()` to the mock Prisma service factory in `mocks.ts` or in the test setup.

---

## Category 3: Not Yet Run

### E2E Tests (164 tests in 9 workflow files)
**Status:** Not run yet -- requires running API server with database
**Blocker:** Need `prisma generate` + `prisma db push` + seed data on server
**Files:**
- `tests/e2e/complete-sale-flow.test.ts`
- `tests/e2e/old-gold-exchange-flow.test.ts`
- `tests/e2e/manufacturing-flow.test.ts`
- `tests/e2e/online-shopping-flow.test.ts`
- `tests/e2e/digital-gold-flow.test.ts`
- `tests/e2e/girvi-lending-flow.test.ts`
- `tests/e2e/wholesale-purchase-flow.test.ts`
- `tests/e2e/kitty-scheme-flow.test.ts`
- `tests/e2e/abandoned-cart-recovery.test.ts`
- `tests/e2e/export-order-flow.test.ts`

---

## Fix Priority

| Priority | Bug | Impact | Effort |
|----------|-----|--------|--------|
| **P0** | Prisma generate on server | Blocks 140+ integration tests | 1 command |
| **P1** | Bug 4: Import COMPLETED instead of FAILED | Logic bug in source | Small fix |
| **P1** | Bug 5: Wildcard permission not handled | Security/RBAC gap | Small fix |
| **P2** | Bug 1 & 2: Manufacturing state transitions | Missing valid transitions | Small fix |
| **P2** | Bug 3: Ecommerce test mock incomplete | Test fix only | Small fix |
| **P2** | Bug 6: Recommendations test expectation | Test fix only | Small fix |
| **P2** | Bug 7: $queryRaw mock missing | Test fix only | Small fix |
