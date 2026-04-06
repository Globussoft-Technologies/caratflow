// ─── E2E Test Context ──────────────────────────────────────────
// Provides a TestContext class with mocked services, factory functions,
// and event capture for asserting domain events in E2E workflow tests.

import { vi } from 'vitest';
import { v4 as uuid } from 'uuid';
import type { DomainEvent, DomainEventType } from '@caratflow/shared-types';

// ─── Event Capture ────────────────────────────────────────────

export interface CapturedEvent {
  event: DomainEvent;
  capturedAt: Date;
}

export class EventCapture {
  private events: CapturedEvent[] = [];

  capture(event: DomainEvent): void {
    this.events.push({ event, capturedAt: new Date() });
  }

  getAll(): CapturedEvent[] {
    return [...this.events];
  }

  getByType<T extends DomainEventType>(type: T): DomainEvent[] {
    return this.events
      .filter((e) => e.event.type === type)
      .map((e) => e.event);
  }

  getLastByType<T extends DomainEventType>(type: T): DomainEvent | undefined {
    const matching = this.getByType(type);
    return matching[matching.length - 1];
  }

  hasEvent(type: DomainEventType): boolean {
    return this.events.some((e) => e.event.type === type);
  }

  count(type?: DomainEventType): number {
    if (!type) return this.events.length;
    return this.events.filter((e) => e.event.type === type).length;
  }

  clear(): void {
    this.events = [];
  }
}

// ─── Mock Event Bus ───────────────────────────────────────────

export function createMockEventBus(capture: EventCapture) {
  return {
    publish: vi.fn(async (event: DomainEvent) => {
      capture.capture(event);
    }),
    subscribe: vi.fn(),
  };
}

// ─── Mock Prisma Service ──────────────────────────────────────

function createModelMock() {
  return {
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    upsert: vi.fn(),
  };
}

export function createMockPrisma() {
  const prisma: Record<string, unknown> = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn(prisma);
    }),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  const models = [
    'user', 'tenant', 'refreshToken', 'stockItem', 'stockMovement',
    'stockTransfer', 'stockTake', 'stockTakeItem', 'sale', 'saleLineItem',
    'salePayment', 'saleReturn', 'repairOrder', 'customOrder', 'layaway',
    'location', 'customer', 'discount', 'journalEntry', 'journalEntryLine',
    'invoice', 'invoiceLineItem', 'taxTransaction', 'payment', 'account',
    'product', 'billOfMaterials', 'bomItem', 'jobOrder', 'jobOrderItem',
    'jobCost', 'productionPlan', 'qualityCheckpoint', 'karigar',
    'karigarAttendance', 'karigarTransaction', 'karigarMetalBalance',
    'loyaltyProgram', 'loyaltyTransaction', 'notificationTemplate',
    'notificationLog', 'customerOccasion', 'lead', 'leadActivity',
    'purchaseOrder', 'purchaseOrderItem', 'goodsReceipt', 'goodsReceiptItem',
    'supplier', 'consignmentOut', 'consignmentOutItem', 'consignmentIn',
    'consignmentInItem', 'creditLimit', 'outstandingBalance', 'agentCommission',
    'bankAccount', 'bankTransaction', 'cart', 'cartItem', 'customerAddress',
    'salesChannel', 'onlineOrder', 'onlineOrderItem', 'onlinePayment',
    'paymentGateway', 'couponCode', 'goldVault', 'goldTransaction',
    'goldSip', 'goldSipExecution', 'goldRedemption', 'girviLoan',
    'girviPayment', 'girviItem', 'kittyScheme', 'kittyMember',
    'kittyInstallment', 'goldSavingsScheme', 'goldSavingsMember',
    'goldSavingsInstallment', 'exportOrder', 'exportOrderItem',
    'exportDocument', 'shipment', 'wishlistItem', 'priceAlert',
    'review', 'kycDocument', 'amlAlert',
  ];

  for (const model of models) {
    prisma[model] = createModelMock();
  }

  return prisma as ReturnType<typeof createModelMock> & Record<string, ReturnType<typeof createModelMock>>;
}

// ─── Test Context ─────────────────────────────────────────────

export class TestContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly adminId: string;
  readonly eventCapture: EventCapture;
  readonly eventBus: ReturnType<typeof createMockEventBus>;
  readonly prisma: ReturnType<typeof createMockPrisma>;

  constructor(options?: { tenantId?: string; userId?: string }) {
    this.tenantId = options?.tenantId ?? `tenant-${uuid().slice(0, 8)}`;
    this.userId = options?.userId ?? `user-${uuid().slice(0, 8)}`;
    this.adminId = `admin-${uuid().slice(0, 8)}`;
    this.eventCapture = new EventCapture();
    this.eventBus = createMockEventBus(this.eventCapture);
    this.prisma = createMockPrisma();
  }

  reset(): void {
    this.eventCapture.clear();
    vi.clearAllMocks();
  }
}

// ─── Factory Functions ────────────────────────────────────────

export function createTestTenant(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}> = {}) {
  return {
    id: overrides.id ?? `tenant-${uuid().slice(0, 8)}`,
    name: overrides.name ?? 'Shree Jewellers',
    slug: overrides.slug ?? 'shree-jewellers',
    isActive: overrides.isActive ?? true,
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    state: 'MH',
    city: 'Mumbai',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTestUser(tenantId: string, overrides: Partial<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}> = {}) {
  return {
    id: overrides.id ?? `user-${uuid().slice(0, 8)}`,
    tenantId,
    email: overrides.email ?? 'salesperson@shreejewellers.com',
    firstName: overrides.firstName ?? 'Rajesh',
    lastName: overrides.lastName ?? 'Sharma',
    role: overrides.role ?? 'salesperson',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTestCustomer(tenantId: string, overrides: Partial<{
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  state: string;
  city: string;
  loyaltyPoints: number;
  loyaltyTier: string;
}> = {}) {
  return {
    id: overrides.id ?? `cust-${uuid().slice(0, 8)}`,
    tenantId,
    firstName: overrides.firstName ?? 'Priya',
    lastName: overrides.lastName ?? 'Patel',
    phone: overrides.phone ?? '+919876543210',
    email: overrides.email ?? 'priya.patel@gmail.com',
    state: overrides.state ?? 'MH',
    city: overrides.city ?? 'Mumbai',
    pincode: '400001',
    addressLine1: '15, Zaveri Bazaar',
    addressLine2: 'Kalbadevi',
    gstin: null,
    pan: 'ABCPP1234Q',
    loyaltyPoints: overrides.loyaltyPoints ?? 0,
    loyaltyTier: overrides.loyaltyTier ?? 'BRONZE',
    isActive: true,
    createdBy: 'system',
    updatedBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTestProduct(tenantId: string, overrides: Partial<{
  id: string;
  name: string;
  sku: string;
  productType: string;
  metalType: string;
  metalPurity: number;
  grossWeightMg: number;
  netWeightMg: number;
  makingCharges: number;
  wastagePercent: number;
  sellingPricePaise: number;
  hsnCode: string;
  huidNumber: string;
}> = {}) {
  return {
    id: overrides.id ?? `prod-${uuid().slice(0, 8)}`,
    tenantId,
    name: overrides.name ?? '22K Gold Ring',
    sku: overrides.sku ?? `SKU-${uuid().slice(0, 6)}`,
    productType: overrides.productType ?? 'GOLD_JEWELRY',
    metalType: overrides.metalType ?? 'GOLD',
    metalPurity: overrides.metalPurity ?? 916,
    // Default: 5 grams = 5000 milligrams
    grossWeightMg: overrides.grossWeightMg ?? BigInt(5000),
    netWeightMg: overrides.netWeightMg ?? BigInt(5000),
    metalWeightMg: overrides.netWeightMg ?? BigInt(5000),
    makingCharges: overrides.makingCharges ?? 50000, // Rs 500/g in paise
    wastagePercent: overrides.wastagePercent ?? 200, // 2% (stored as x100)
    sellingPricePaise: overrides.sellingPricePaise ?? BigInt(3600000), // Rs 36,000
    hsnCode: overrides.hsnCode ?? '7113',
    huidNumber: overrides.huidNumber ?? `HUID${uuid().slice(0, 6).toUpperCase()}`,
    images: [],
    isActive: true,
    createdBy: 'system',
    updatedBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTestLocation(tenantId: string, overrides: Partial<{
  id: string;
  name: string;
  city: string;
  state: string;
  locationType: string;
}> = {}) {
  return {
    id: overrides.id ?? `loc-${uuid().slice(0, 8)}`,
    tenantId,
    name: overrides.name ?? 'Zaveri Bazaar Showroom',
    city: overrides.city ?? 'Mumbai',
    state: overrides.state ?? 'MH',
    locationType: overrides.locationType ?? 'SHOWROOM',
    addressLine1: '101, Dhanji Street',
    addressLine2: 'Kalbadevi',
    pincode: '400002',
    phone: '+912222345678',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTestStockItem(tenantId: string, productId: string, locationId: string, overrides: Partial<{
  id: string;
  quantityOnHand: number;
  quantityReserved: number;
}> = {}) {
  return {
    id: overrides.id ?? `si-${uuid().slice(0, 8)}`,
    tenantId,
    productId,
    locationId,
    quantityOnHand: overrides.quantityOnHand ?? 10,
    quantityReserved: overrides.quantityReserved ?? 0,
    quantityOnOrder: 0,
    reorderLevel: 2,
    reorderQuantity: 5,
    binLocation: 'A-1-01',
    createdBy: 'system',
    updatedBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTestSupplier(tenantId: string, overrides: Partial<{
  id: string;
  name: string;
  gstin: string;
  state: string;
}> = {}) {
  return {
    id: overrides.id ?? `sup-${uuid().slice(0, 8)}`,
    tenantId,
    name: overrides.name ?? 'Rajesh Gold Refinery',
    gstin: overrides.gstin ?? '27AAECR4567P1ZQ',
    state: overrides.state ?? 'MH',
    city: 'Mumbai',
    phone: '+912233445566',
    email: 'orders@rajeshgold.com',
    isActive: true,
    createdBy: 'system',
    updatedBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTestAccount(tenantId: string, overrides: Partial<{
  id: string;
  name: string;
  accountCode: string;
  accountType: string;
}> = {}) {
  return {
    id: overrides.id ?? `acc-${uuid().slice(0, 8)}`,
    tenantId,
    name: overrides.name ?? 'Cash Account',
    accountCode: overrides.accountCode ?? '1001',
    accountType: overrides.accountType ?? 'ASSET',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
