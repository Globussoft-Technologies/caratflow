# CaratFlow Module Development Guide

## How to Add a New Module

This guide walks through adding a new domain module to CaratFlow, using a hypothetical "Girvi" (gold loan) module as an example.

### Step 1: Define Types (`packages/shared-types/src/girvi.ts`)

Create a new file for the module's types, enums, and Zod schemas.

```typescript
import { z } from 'zod';

export enum GirviStatus {
  ACTIVE = 'ACTIVE',
  PARTIALLY_REDEEMED = 'PARTIALLY_REDEEMED',
  REDEEMED = 'REDEEMED',
  AUCTIONED = 'AUCTIONED',
}

export const GirviInputSchema = z.object({
  customerId: z.string().uuid(),
  locationId: z.string().uuid(),
  items: z.array(z.object({
    description: z.string(),
    metalType: z.string(),
    grossWeightMg: z.number().int().positive(),
    fineness: z.number().int().min(1).max(999),
    valuationPaise: z.number().int().positive(),
  })),
  principalAmountPaise: z.number().int().positive(),
  interestRatePercent: z.number().positive(),
  durationDays: z.number().int().positive(),
});

export type GirviInput = z.infer<typeof GirviInputSchema>;
```

Export from the shared-types index file.

### Step 2: Define the Prisma Schema (`packages/db/prisma/schema/girvi.prisma`)

```prisma
model Girvi {
  id                   String   @id @default(uuid()) @db.VarChar(36)
  tenantId             String   @map("tenant_id") @db.VarChar(36)
  girviNumber          String   @map("girvi_number") @db.VarChar(50)
  customerId           String   @map("customer_id") @db.VarChar(36)
  locationId           String   @map("location_id") @db.VarChar(36)
  status               String   @default("ACTIVE") @db.VarChar(30)
  principalAmountPaise BigInt   @map("principal_amount_paise")
  interestRatePercent  Int      @map("interest_rate_percent")
  startDate            DateTime @map("start_date")
  dueDate              DateTime @map("due_date")
  createdBy            String   @map("created_by") @db.VarChar(36)
  updatedBy            String   @map("updated_by") @db.VarChar(36)
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  customer  Customer    @relation(fields: [customerId], references: [id])
  location  Location    @relation(fields: [locationId], references: [id])
  items     GirviItem[]

  @@map("girvis")
  @@index([tenantId])
  @@index([tenantId, status])
  @@unique([tenantId, girviNumber])
}
```

### Step 3: Create the NestJS Module (`apps/api/src/modules/girvi/`)

Directory structure:

```
apps/api/src/modules/girvi/
  girvi.module.ts         NestJS module definition
  girvi.service.ts        Business logic
  girvi.trpc.ts           tRPC router
  girvi.event-handler.ts  Event subscribers (optional)
```

**Module file (`girvi.module.ts`):**

```typescript
import { Module } from '@nestjs/common';
import { GirviService } from './girvi.service';
import { GirviTrpcRouter } from './girvi.trpc';

@Module({
  providers: [GirviService, GirviTrpcRouter],
  exports: [GirviService, GirviTrpcRouter],
})
export class GirviModule {}
```

**Service file (`girvi.service.ts`):**

```typescript
import { Injectable } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class GirviService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(tenantId: string, userId: string, input: GirviInput) {
    // Business logic here
  }
}
```

### Step 4: Register the Module

Add the new module to the root AppModule in `apps/api/src/app.module.ts`:

```typescript
import { GirviModule } from './modules/girvi/girvi.module';

@Module({
  imports: [
    // ... existing modules
    GirviModule,
  ],
})
export class AppModule {}
```

### Step 5: Add the tRPC Router

Register the tRPC router in the root router:

```typescript
// apps/api/src/trpc/root.router.ts
import { girviRouter } from '../modules/girvi/girvi.trpc';

export const appRouter = router({
  // ... existing routers
  girvi: girviRouter,
});
```

### Step 6: Create Frontend Pages (`apps/web/app/(dashboard)/girvi/`)

```
apps/web/app/(dashboard)/girvi/
  page.tsx              List page
  [id]/page.tsx         Detail page
  new/page.tsx          Create form
```

Follow the established page pattern: `PageHeader` + content, using tRPC hooks for data fetching.

### Step 7: Add Events (if needed)

Define event types in `packages/shared-types/src/events.ts`:

```typescript
export interface GirviCreatedEvent extends DomainEvent {
  type: 'girvi.created';
  payload: {
    girviId: string;
    customerId: string;
    principalPaise: number;
  };
}
```

Publish from the service, subscribe in `girvi.event-handler.ts`.

### Step 8: Write Tests

- `girvi.service.spec.ts` -- Unit tests with mocked Prisma
- `girvi.test.ts` in `apps/api/src/__tests__/` -- Integration tests

## File/Directory Conventions

| Type        | Location                                    | Naming             |
|-------------|--------------------------------------------|--------------------|
| Module      | `apps/api/src/modules/{domain}/`           | `{domain}.module.ts`     |
| Service     | `apps/api/src/modules/{domain}/`           | `{domain}.service.ts`    |
| tRPC Router | `apps/api/src/modules/{domain}/`           | `{domain}.trpc.ts`       |
| Events      | `apps/api/src/modules/{domain}/`           | `{domain}.event-handler.ts` |
| Types       | `packages/shared-types/src/`               | `{domain}.ts`            |
| Prisma      | `packages/db/prisma/schema/`               | `{domain}.prisma`        |
| Pages       | `apps/web/app/(dashboard)/{domain}/`       | `page.tsx`               |
| Unit Tests  | alongside source file                       | `*.spec.ts`              |
| Integration | `apps/api/src/__tests__/`                  | `*.test.ts`              |

## Prisma Schema Conventions

- Table name: `snake_case` plural via `@@map("table_name")`
- Column name: `snake_case` via `@map("column_name")`
- Always include `tenantId` with `@@index([tenantId])`
- Money fields: `BigInt` with `Paise` suffix
- Weight fields: `BigInt` with `Mg` suffix
- IDs: `@id @default(uuid()) @db.VarChar(36)`
- Timestamps: `createdAt @default(now())`, `updatedAt @updatedAt`
- Audit: `createdBy`, `updatedBy` fields

## tRPC Router Conventions

```typescript
import { router, protectedProcedure } from '../../trpc/trpc';

export const girviRouter = router({
  list: protectedProcedure
    .input(GirviFilterSchema)
    .query(async ({ ctx, input }) => {
      return ctx.girviService.list(ctx.tenantId, input);
    }),

  create: protectedProcedure
    .input(GirviInputSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.girviService.create(ctx.tenantId, ctx.userId, input);
    }),
});
```

## Event Publishing/Subscribing

**Publishing:**

```typescript
await this.eventBus.publish({
  id: uuid(),
  tenantId,
  userId,
  timestamp: new Date().toISOString(),
  type: 'girvi.created',
  payload: { girviId, customerId, principalPaise },
});
```

**Subscribing:**

```typescript
@Injectable()
export class GirviEventHandler {
  constructor(private readonly eventBus: EventBusService) {
    this.eventBus.subscribe('financial.payment.received', this.handlePayment.bind(this));
  }

  private async handlePayment(event: DomainEvent) {
    // Handle payment received -- check if it is for a girvi
  }
}
```

## Testing Conventions

- **Unit tests** (`*.spec.ts`): Mock PrismaService with `vi.mock`, test business logic
- **Integration tests** (`*.test.ts`): Mock at service boundaries, test full service methods
- **E2E tests** (`*.e2e.ts`): Test against running API, require seeded database
- Use `describe`/`it` pattern from Vitest
- Test business rules, not just CRUD operations
- Test error paths and edge cases
- Use `createMockPrismaService()` from the test setup
