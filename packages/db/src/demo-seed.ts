/**
 * CaratFlow Rich Demo Seed
 * ------------------------------------------------------------
 * Idempotent seed that populates a rich demo dataset for tenant
 * `sharma-jewellers` so the live demo + hackathon screenshots
 * have realistic-looking data across every module.
 *
 * Safe to run repeatedly -- uses deterministic IDs derived from
 * slugs so re-runs upsert rather than duplicate.
 *
 * Usage:  pnpm --filter @caratflow/db demo-seed
 *         or:  pnpm db:demo-seed   (from the repo root)
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Load DATABASE_URL from repo-root .env if not already set.
if (!process.env.DATABASE_URL) {
  const candidates = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
        if (m) {
          let val = m[2]!.trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[m[1]!]) process.env[m[1]!] = val;
        }
      }
      break;
    }
  }
}

const prisma = new PrismaClient();

// ─── Deterministic ID helper ─────────────────────────────────
// Given any key string, returns a stable UUID-shaped (36-char) id.
function did(key: string): string {
  const hash = crypto.createHash('sha1').update(key).digest('hex'); // 40 chars
  // Format like a UUID v4: 8-4-4-4-12
  return (
    hash.slice(0, 8) +
    '-' +
    hash.slice(8, 12) +
    '-' +
    '4' + hash.slice(13, 16) +
    '-' +
    '8' + hash.slice(17, 20) +
    '-' +
    hash.slice(20, 32)
  );
}

// ─── Random helper (seeded to be stable) ─────────────────────
let _rngState = 42;
function rand(): number {
  // simple LCG for determinism
  _rngState = (_rngState * 1103515245 + 12345) & 0x7fffffff;
  return _rngState / 0x7fffffff;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysAhead(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Data pools ──────────────────────────────────────────────
const firstNames = [
  'Priya', 'Rahul', 'Anjali', 'Vikram', 'Sneha', 'Arjun',
  'Rohit', 'Kavita', 'Amit', 'Neha', 'Suresh', 'Deepa',
  'Karan', 'Pooja', 'Sanjay', 'Meera', 'Ravi', 'Divya',
  'Nikhil', 'Shreya', 'Ajay', 'Swati', 'Manoj', 'Ritika',
  'Abhishek', 'Isha', 'Gaurav', 'Aarti', 'Varun', 'Kiran',
  'Harsh', 'Simran', 'Rakesh', 'Pallavi', 'Vivek', 'Tanya',
  'Yash', 'Nisha', 'Sameer', 'Komal', 'Hardik', 'Megha',
  'Alok', 'Rhea', 'Deepak', 'Bhavna', 'Dev', 'Aditi',
  'Rohan', 'Shruti',
];
const lastNames = [
  'Sharma', 'Patel', 'Kumar', 'Shah', 'Gupta', 'Mehta',
  'Agarwal', 'Singh', 'Reddy', 'Iyer', 'Nair', 'Joshi',
  'Desai', 'Kapoor', 'Malhotra', 'Chopra', 'Bansal', 'Rao',
  'Menon', 'Bhatt',
];
const cities = [
  { city: 'Mumbai', state: 'Maharashtra', pin: '400001' },
  { city: 'Delhi', state: 'Delhi', pin: '110001' },
  { city: 'Bengaluru', state: 'Karnataka', pin: '560001' },
  { city: 'Chennai', state: 'Tamil Nadu', pin: '600001' },
  { city: 'Kolkata', state: 'West Bengal', pin: '700001' },
];

const productCategories: Array<{
  cat: string;
  skuPrefix: string;
  baseName: string;
  weightRange: [number, number]; // grams
  hsn: string;
  image: string;
}> = [
  { cat: 'Ring',        skuPrefix: 'RING',  baseName: 'Gold Ring',        weightRange: [3, 8],   hsn: '7113', image: 'https://picsum.photos/seed/ring/600/600' },
  { cat: 'Necklace',    skuPrefix: 'NECK',  baseName: 'Gold Necklace',    weightRange: [20, 60], hsn: '7113', image: 'https://picsum.photos/seed/necklace/600/600' },
  { cat: 'Bangle',      skuPrefix: 'BANG',  baseName: 'Gold Bangle',      weightRange: [15, 30], hsn: '7113', image: 'https://picsum.photos/seed/bangle/600/600' },
  { cat: 'Earring',     skuPrefix: 'EARR',  baseName: 'Gold Earring',     weightRange: [4, 12],  hsn: '7113', image: 'https://picsum.photos/seed/earring/600/600' },
  { cat: 'Chain',       skuPrefix: 'CHAI',  baseName: 'Gold Chain',       weightRange: [10, 25], hsn: '7113', image: 'https://picsum.photos/seed/chain/600/600' },
  { cat: 'Pendant',     skuPrefix: 'PEND',  baseName: 'Gold Pendant',     weightRange: [2, 6],   hsn: '7113', image: 'https://picsum.photos/seed/pendant/600/600' },
  { cat: 'Bracelet',    skuPrefix: 'BRAC',  baseName: 'Gold Bracelet',    weightRange: [8, 20],  hsn: '7113', image: 'https://picsum.photos/seed/bracelet/600/600' },
  { cat: 'Mangalsutra', skuPrefix: 'MANG',  baseName: 'Mangalsutra',      weightRange: [12, 25], hsn: '7113', image: 'https://picsum.photos/seed/mangalsutra/600/600' },
  { cat: 'Nosepin',     skuPrefix: 'NOSE',  baseName: 'Nose Pin',         weightRange: [1, 3],   hsn: '7113', image: 'https://picsum.photos/seed/nosepin/600/600' },
];
const purities = [916, 750, 585]; // 22K, 18K, 14K

async function main() {
  console.warn('▶ CaratFlow DEMO seed starting...');

  // Resolve tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'sharma-jewellers' } });
  if (!tenant) {
    throw new Error('Base tenant "sharma-jewellers" not found. Run `pnpm db:seed` first.');
  }
  const tenantId = tenant.id;

  // Resolve admin role + existing admin user (for FK references)
  const adminRole = await prisma.role.findFirst({ where: { tenantId, name: 'Admin' } });
  const managerRole = await prisma.role.findFirst({ where: { tenantId, name: 'Manager' } });
  const salesRole = await prisma.role.findFirst({ where: { tenantId, name: 'Sales Associate' } });
  if (!adminRole || !managerRole || !salesRole) {
    throw new Error('Base roles not found. Run `pnpm db:seed` first.');
  }

  // ─── Locations (ensure 3 canonical demo locations) ────────
  const locDefs = [
    { key: 'showroom-main', name: 'Main Showroom - Zaveri Bazaar', type: 'SHOWROOM' as const, city: 'Mumbai', state: 'Maharashtra', pin: '400002' },
    { key: 'workshop-main', name: 'Andheri Workshop',              type: 'WORKSHOP' as const, city: 'Mumbai', state: 'Maharashtra', pin: '400096' },
    { key: 'warehouse-bkc', name: 'BKC Central Warehouse',         type: 'WAREHOUSE' as const, city: 'Mumbai', state: 'Maharashtra', pin: '400051' },
  ];
  const locationIds: Record<string, string> = {};
  for (const l of locDefs) {
    const id = did(`loc-${tenantId}-${l.key}`);
    locationIds[l.key] = id;
    await prisma.location.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, name: l.name, locationType: l.type,
        address: `Demo address, ${l.city}`,
        city: l.city, state: l.state, country: 'IN', postalCode: l.pin,
        phone: '+912288' + randInt(100000, 999999),
        email: `${l.key}@sharmajewellers.com`,
        settings: { demo: true },
      },
    });
  }
  const primaryLocId = locationIds['showroom-main']!;
  const workshopLocId = locationIds['workshop-main']!;
  console.warn('  ✓ Locations');

  // ─── Staff users (6) ──────────────────────────────────────
  const staffDefs = [
    { first: 'Priya',   last: 'Sharma',   role: managerRole.id, title: 'Store Manager' },
    { first: 'Rahul',   last: 'Verma',    role: salesRole.id,   title: 'Senior Sales' },
    { first: 'Anjali',  last: 'Patel',    role: salesRole.id,   title: 'Sales Associate' },
    { first: 'Vikram',  last: 'Singh',    role: managerRole.id, title: 'Workshop Head' },
    { first: 'Sneha',   last: 'Reddy',    role: salesRole.id,   title: 'Sales Associate' },
    { first: 'Arjun',   last: 'Mehta',    role: adminRole.id,   title: 'Operations' },
  ];
  const staffPasswordHash = 'demo:' + crypto.createHash('sha256').update('demo123').digest('hex');
  const staffUserIds: string[] = [];
  for (const s of staffDefs) {
    const id = did(`user-${tenantId}-${s.first}-${s.last}`);
    staffUserIds.push(id);
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        email: `${s.first.toLowerCase()}.${s.last.toLowerCase()}@sharmajewellers.com`,
        passwordHash: staffPasswordHash,
        firstName: s.first, lastName: s.last,
        roleId: s.role,
        preferences: { title: s.title, demo: true },
      },
    });
  }
  const defaultUserId = staffUserIds[0]!;
  console.warn('  ✓ Staff users (6)');

  // ─── Customers (50) ───────────────────────────────────────
  const customerIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const first = firstNames[i % firstNames.length]!;
    const last = lastNames[i % lastNames.length]!;
    const city = cities[i % cities.length]!;
    const id = did(`cust-${tenantId}-${i}-${first}-${last}`);
    customerIds.push(id);
    await prisma.customer.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        firstName: first, lastName: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
        phone: '+9198' + String(10000000 + i * 137).slice(0, 8),
        city: city.city, state: city.state, country: 'IN', postalCode: city.pin,
        address: `${randInt(1, 999)}, ${city.city} Street`,
        customerType: 'RETAIL',
        loyaltyPoints: randInt(0, 5000),
        loyaltyTier: pick(['SILVER', 'GOLD', 'PLATINUM']),
        dateOfBirth: new Date(1970 + (i % 30), i % 12, (i % 27) + 1),
        anniversary: i % 3 === 0 ? new Date(2000 + (i % 20), (i + 5) % 12, (i % 27) + 1) : null,
        preferences: { notifications: { whatsapp: true, sms: true }, demo: true },
      },
    });

    // Customer Occasion
    if (i % 2 === 0) {
      const occId = did(`occ-${id}`);
      await prisma.customerOccasion.upsert({
        where: { id: occId },
        update: {},
        create: {
          id: occId, tenantId, customerId: id,
          occasionType: pick(['BIRTHDAY', 'ANNIVERSARY', 'WEDDING', 'FESTIVAL']),
          date: daysAhead(randInt(1, 180)),
          description: 'Demo occasion reminder',
          reminderDaysBefore: 7,
        },
      });
    }
  }
  console.warn('  ✓ Customers (50)');

  // ─── Categories (resolve or create minimal ones) ──────────
  let ringCat = await prisma.category.findFirst({ where: { tenantId, name: 'Ring' } });
  if (!ringCat) {
    // Fallback: use any existing category
    ringCat = await prisma.category.findFirst({ where: { tenantId } });
  }
  const defaultCategoryId = ringCat?.id ?? null;

  // ─── Products (80) ────────────────────────────────────────
  const productIds: string[] = [];
  for (let i = 0; i < 80; i++) {
    const def = productCategories[i % productCategories.length]!;
    const purity = purities[i % purities.length]!;
    const purityLabel = purity === 916 ? '22K' : purity === 750 ? '18K' : '14K';
    const weightG = randInt(def.weightRange[0], def.weightRange[1]);
    const grossMg = BigInt(weightG * 1000);
    const netMg = BigInt(Math.floor(weightG * 0.92 * 1000));
    const ratePerG = purity === 916 ? 6500 : purity === 750 ? 5320 : 4100;
    const metalValuePaise = BigInt(Math.floor(weightG * ratePerG * 100 * 0.92));
    const makingPaise = BigInt(randInt(800, 2500) * 100);
    const sellingPaise = metalValuePaise + makingPaise;
    const sku = `SJ-${def.skuPrefix}-${purityLabel}-${String(i + 1).padStart(3, '0')}`;
    const huid = crypto.createHash('sha1').update(sku).digest('hex').slice(0, 6).toUpperCase();
    const id = did(`prod-${tenantId}-${sku}`);
    productIds.push(id);
    await prisma.product.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, sku,
        name: `${purityLabel} ${def.baseName} ${String.fromCharCode(65 + (i % 26))}${(i % 10) + 1}`,
        description: `Finely crafted ${purityLabel} ${def.baseName.toLowerCase()} with BIS hallmark.`,
        categoryId: defaultCategoryId,
        productType: 'GOLD',
        metalPurity: purity,
        grossWeightMg: grossMg,
        netWeightMg: netMg,
        metalWeightMg: netMg,
        makingCharges: makingPaise,
        wastagePercent: 200, // 2.00%
        huidNumber: huid,
        hallmarkNumber: `HM-${huid}`,
        costPricePaise: BigInt(Number(sellingPaise) * 0.85),
        sellingPricePaise: sellingPaise,
        images: [def.image, def.image + '?2'],
        attributes: { purity: purityLabel, finish: 'Polished', occasion: pick(['Bridal', 'Daily Wear', 'Festive']) },
      },
    });
  }
  console.warn('  ✓ Products (80)');

  // ─── Stock Items (30 across 3 locations) ──────────────────
  const locIdArr = Object.values(locationIds);
  for (let i = 0; i < 30; i++) {
    const pid = productIds[i % productIds.length]!;
    const lid = locIdArr[i % locIdArr.length]!;
    const id = did(`stock-${tenantId}-${pid}-${lid}`);
    await prisma.stockItem.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, productId: pid, locationId: lid,
        quantityOnHand: randInt(1, 12),
        reorderLevel: 2,
        reorderQuantity: 10,
        binLocation: `A${randInt(1, 20)}-${randInt(1, 5)}`,
      },
    });
  }
  console.warn('  ✓ Stock items (30)');

  // ─── HUID records (15) ────────────────────────────────────
  for (let i = 0; i < 15; i++) {
    const pid = productIds[i]!;
    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product || !product.huidNumber) continue;
    const id = did(`huid-${tenantId}-${pid}`);
    try {
      await prisma.huidRecord.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId, productId: pid,
          huidNumber: product.huidNumber,
          articleType: 'Gold Ornament',
          metalType: 'GOLD',
          purityFineness: product.metalPurity ?? 916,
          weightMg: product.grossWeightMg ?? BigInt(10000),
          registeredAt: daysAgo(randInt(1, 90)),
          status: 'ACTIVE',
          verifiedAt: daysAgo(randInt(1, 90)),
        },
      });
    } catch {
      // huid conflict -- skip
    }
  }
  console.warn('  ✓ HUID records (15)');

  // ─── Sales (50) ───────────────────────────────────────────
  for (let i = 0; i < 50; i++) {
    const saleId = did(`sale-${tenantId}-${i}`);
    const custId = customerIds[i % customerIds.length]!;
    const when = daysAgo(randInt(0, 90));
    const saleNumber = `INV-DEMO-${String(i + 1).padStart(5, '0')}`;
    const lineCount = randInt(1, 3);
    const lineItems: Array<{
      id: string; productId: string; unitPrice: bigint; qty: number; lineTotal: bigint; cgst: bigint; sgst: bigint;
    }> = [];
    let subtotal = BigInt(0);
    let totalTax = BigInt(0);
    for (let j = 0; j < lineCount; j++) {
      const pid = productIds[(i * 3 + j) % productIds.length]!;
      const p = await prisma.product.findUnique({ where: { id: pid }, select: { sellingPricePaise: true } });
      const unit = p?.sellingPricePaise ?? BigInt(50000 * 100);
      const qty = 1;
      const lineBase = unit * BigInt(qty);
      // 3% GST (1.5 + 1.5)
      const cgst = lineBase * BigInt(150) / BigInt(10000);
      const sgst = cgst;
      const lineTotal = lineBase + cgst + sgst;
      subtotal += lineBase;
      totalTax += cgst + sgst;
      lineItems.push({
        id: did(`sli-${saleId}-${j}`),
        productId: pid, unitPrice: unit, qty, lineTotal, cgst, sgst,
      });
    }
    const discount = i % 4 === 0 ? subtotal * BigInt(5) / BigInt(100) : BigInt(0);
    const total = subtotal + totalTax - discount;

    await prisma.sale.upsert({
      where: { id: saleId },
      update: {},
      create: {
        id: saleId, tenantId,
        saleNumber,
        customerId: custId,
        locationId: primaryLocId,
        userId: defaultUserId,
        status: 'COMPLETED',
        subtotalPaise: subtotal,
        discountPaise: discount,
        taxPaise: totalTax,
        totalPaise: total,
        createdAt: when,
        updatedAt: when,
        notes: 'Demo sale',
        lineItems: {
          create: lineItems.map((li) => ({
            id: li.id, tenantId,
            productId: li.productId,
            description: `Demo line item for product`,
            quantity: li.qty,
            unitPricePaise: li.unitPrice,
            lineTotalPaise: li.lineTotal,
            cgstPaise: li.cgst,
            sgstPaise: li.sgst,
            gstRate: 300,
            hsnCode: '7113',
          })),
        },
        payments: {
          create: [{
            id: did(`pay-${saleId}`),
            tenantId,
            method: pick(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER']),
            amountPaise: total,
            status: 'COMPLETED',
            processedAt: when,
          }],
        },
      },
    });
  }
  console.warn('  ✓ Sales (50)');

  // ─── Suppliers (8) ────────────────────────────────────────
  const supplierIds: string[] = [];
  const supplierNames = [
    'Rajhans Gold Traders', 'Mumbai Bullion Co.', 'Zaveri Refinery',
    'Malabar Gold Suppliers', 'Diamond House Pvt Ltd', 'Surat Gem Works',
    'Jaipur Kundan Crafts', 'Chennai Pearl Imports',
  ];
  for (let i = 0; i < supplierNames.length; i++) {
    const name = supplierNames[i]!;
    const id = did(`sup-${tenantId}-${name}`);
    supplierIds.push(id);
    await prisma.supplier.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, name,
        contactPerson: pick(firstNames) + ' ' + pick(lastNames),
        email: `contact@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        phone: '+9198' + randInt(10000000, 99999999),
        gstinNumber: `27AAACS${randInt(1000, 9999)}Q1Z${randInt(1, 9)}`,
        panNumber: `AAACS${randInt(1000, 9999)}Q`,
        city: 'Mumbai', state: 'Maharashtra', country: 'IN',
        supplierType: pick(['BULLION', 'MANUFACTURER', 'WHOLESALER']),
        rating: randInt(3, 5),
      },
    });
  }
  console.warn('  ✓ Suppliers (8)');

  // ─── Purchase Orders (15) ─────────────────────────────────
  for (let i = 0; i < 15; i++) {
    const id = did(`po-${tenantId}-${i}`);
    const supId = supplierIds[i % supplierIds.length]!;
    const subtotal = BigInt(randInt(50000, 500000) * 100);
    const tax = subtotal * BigInt(3) / BigInt(100);
    const total = subtotal + tax;
    const status = pick(['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'RECEIVED'] as const);
    await prisma.purchaseOrder.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        poNumber: `PO-DEMO-${String(i + 1).padStart(4, '0')}`,
        supplierId: supId,
        locationId: primaryLocId,
        status,
        subtotalPaise: subtotal,
        taxPaise: tax,
        totalPaise: total,
        expectedDate: daysAhead(randInt(5, 30)),
        notes: 'Demo purchase order',
        items: {
          create: [{
            id: did(`po-item-${id}-1`),
            tenantId,
            description: 'Gold 22K bulk',
            quantity: randInt(5, 20),
            unitPricePaise: BigInt(randInt(5000, 10000) * 100),
            totalPaise: subtotal,
            weightMg: BigInt(randInt(50, 500) * 1000),
            purityFineness: 916,
          }],
        },
      },
    });
  }
  console.warn('  ✓ Purchase orders (15)');

  // ─── Karigars (6) ─────────────────────────────────────────
  const karigarNames = ['Ramesh', 'Suresh', 'Mahesh', 'Dinesh', 'Mukesh', 'Lokesh'];
  const karigarIds: string[] = [];
  for (let i = 0; i < karigarNames.length; i++) {
    const id = did(`karigar-${tenantId}-${karigarNames[i]}`);
    karigarIds.push(id);
    await prisma.karigar.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        employeeCode: `KAR-${String(i + 1).padStart(3, '0')}`,
        firstName: karigarNames[i]!,
        lastName: 'Kumar',
        phone: '+9199' + randInt(10000000, 99999999),
        specialization: pick(['Filigree', 'Kundan setting', 'Stone setting', 'Polish', 'Casting']),
        skillLevel: pick(['JUNIOR', 'SENIOR', 'MASTER']),
        dailyWagePaise: BigInt(randInt(800, 2500) * 100),
        locationId: workshopLocId,
        joiningDate: daysAgo(randInt(100, 2000)),
      },
    });
  }
  console.warn('  ✓ Karigars (6)');

  // ─── BOMs (5) ─────────────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const pid = productIds[i]!;
    const id = did(`bom-${tenantId}-${i}`);
    await prisma.billOfMaterials.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        name: `BOM for product ${i + 1}`,
        productId: pid,
        status: 'ACTIVE',
        estimatedCostPaise: BigInt(randInt(50000, 200000) * 100),
        estimatedTimeMins: randInt(120, 720),
        notes: 'Demo bill of materials',
      },
    });
  }
  console.warn('  ✓ BOMs (5)');

  // ─── Job Orders (8) ───────────────────────────────────────
  const jobStatuses = ['DRAFT', 'PLANNED', 'MATERIAL_ISSUED', 'IN_PROGRESS', 'QC_PENDING', 'QC_PASSED', 'COMPLETED', 'CANCELLED'] as const;
  for (let i = 0; i < 8; i++) {
    const id = did(`job-${tenantId}-${i}`);
    await prisma.jobOrder.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        jobNumber: `JOB-DEMO-${String(i + 1).padStart(4, '0')}`,
        productId: productIds[i]!,
        locationId: workshopLocId,
        status: jobStatuses[i]!,
        priority: pick(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
        quantity: randInt(1, 5),
        assignedKarigarId: karigarIds[i % karigarIds.length]!,
        estimatedStartDate: daysAgo(randInt(1, 20)),
        estimatedEndDate: daysAhead(randInt(5, 30)),
        notes: 'Demo job order',
        specialInstructions: 'Handle with care, polish finish',
      },
    });
  }
  console.warn('  ✓ Job orders (8)');

  // ─── Girvi Loans (5) ──────────────────────────────────────
  const girviStatuses = ['ACTIVE', 'ACTIVE', 'PARTIALLY_PAID', 'CLOSED', 'DEFAULTED'] as const;
  for (let i = 0; i < 5; i++) {
    const id = did(`girvi-${tenantId}-${i}`);
    const principal = BigInt(randInt(50000, 500000) * 100);
    const outstandingP = girviStatuses[i] === 'CLOSED' ? BigInt(0) : principal;
    await prisma.girviLoan.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        loanNumber: `GIRVI-DEMO-${String(i + 1).padStart(4, '0')}`,
        customerId: customerIds[i]!,
        locationId: primaryLocId,
        status: girviStatuses[i]!,
        collateralDescription: 'Gold necklace and bangles',
        metalType: 'GOLD',
        grossWeightMg: BigInt(randInt(30, 120) * 1000),
        netWeightMg: BigInt(randInt(28, 115) * 1000),
        purityFineness: 916,
        appraisedValuePaise: principal * BigInt(130) / BigInt(100),
        loanAmountPaise: principal,
        interestRate: 1800, // 18%
        interestType: 'SIMPLE',
        disbursedDate: daysAgo(randInt(30, 180)),
        dueDate: daysAhead(randInt(-30, 180)),
        outstandingPrincipalPaise: outstandingP,
        outstandingInterestPaise: BigInt(0),
        totalPrincipalPaidPaise: principal - outstandingP,
        aadhaarVerified: true,
        panVerified: true,
      },
    });
  }
  console.warn('  ✓ Girvi loans (5)');

  // ─── Gold Savings Schemes (3) ─────────────────────────────
  const gsSchemeIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const id = did(`gs-scheme-${tenantId}-${i}`);
    gsSchemeIds.push(id);
    await prisma.goldSavingsScheme.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        schemeName: pick(['Shagun Gold Plan', 'Dhanlaxmi Saver', 'Swarna Samriddhi']) + ` ${i + 1}`,
        monthlyAmountPaise: BigInt(randInt(2, 10) * 1000 * 100),
        durationMonths: 11,
        bonusMonths: 1,
        maturityBonusPercent: 800,
        startDate: daysAgo(randInt(30, 300)),
        status: 'ACTIVE',
        terms: 'Pay 11 months, get 12 months',
      },
    });
  }
  // Members for schemes (5-10 each)
  for (let s = 0; s < 3; s++) {
    const memberCount = randInt(5, 10);
    for (let m = 0; m < memberCount; m++) {
      const id = did(`gs-mem-${tenantId}-${s}-${m}`);
      await prisma.goldSavingsMember.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId,
          goldSavingsSchemeId: gsSchemeIds[s]!,
          customerId: customerIds[(s * 10 + m) % customerIds.length]!,
          memberNumber: `GS-${s + 1}-${String(m + 1).padStart(3, '0')}`,
          joinedDate: daysAgo(randInt(10, 200)),
          status: 'ACTIVE',
          totalPaidPaise: BigInt(randInt(5, 50) * 1000 * 100),
        },
      });
    }
  }
  console.warn('  ✓ Gold savings schemes (3 + members)');

  // ─── Kitty Schemes (2) ────────────────────────────────────
  const kittySchemeIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const id = did(`kitty-${tenantId}-${i}`);
    kittySchemeIds.push(id);
    await prisma.kittyScheme.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        schemeName: `Kitty Scheme ${i + 1}`,
        schemeType: 'KITTY',
        monthlyAmountPaise: BigInt(5000 * 100),
        durationMonths: 12,
        totalValuePaise: BigInt(60000 * 100),
        bonusPercent: 500,
        startDate: daysAgo(60),
        endDate: daysAhead(300),
        status: 'ACTIVE',
        maxMembers: 20,
        currentMembers: 8,
      },
    });
    for (let m = 0; m < 8; m++) {
      const mid = did(`kitty-mem-${id}-${m}`);
      await prisma.kittyMember.upsert({
        where: { id: mid },
        update: {},
        create: {
          id: mid, tenantId,
          kittySchemeId: id,
          customerId: customerIds[(i * 8 + m) % customerIds.length]!,
          memberNumber: `K${i + 1}-M${m + 1}`,
          joinedDate: daysAgo(60),
          paidInstallments: randInt(1, 6),
          totalPaidPaise: BigInt(randInt(5000, 30000) * 100),
        },
      });
    }
  }
  console.warn('  ✓ Kitty schemes (2 + members)');

  // ─── Invoices (20) ────────────────────────────────────────
  for (let i = 0; i < 20; i++) {
    const id = did(`inv-${tenantId}-${i}`);
    const subtotal = BigInt(randInt(10000, 200000) * 100);
    const tax = subtotal * BigInt(3) / BigInt(100);
    const total = subtotal + tax;
    const statuses = ['PAID', 'PAID', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'] as const;
    const status = statuses[i % statuses.length]!;
    await prisma.invoice.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        invoiceNumber: `FIN-INV-${String(i + 1).padStart(5, '0')}`,
        invoiceType: 'SALES',
        customerId: customerIds[i % customerIds.length]!,
        locationId: primaryLocId,
        status,
        subtotalPaise: subtotal,
        taxPaise: tax,
        totalPaise: total,
        paidPaise: status === 'PAID' ? total : status === 'PARTIALLY_PAID' ? total / BigInt(2) : BigInt(0),
        dueDate: daysAhead(randInt(-30, 30)),
      },
    });
  }
  console.warn('  ✓ Invoices (20)');

  // ─── Campaigns (10) ───────────────────────────────────────
  const campaignChannels = ['EMAIL', 'SMS', 'WHATSAPP'] as const;
  for (let i = 0; i < 10; i++) {
    const id = did(`camp-${tenantId}-${i}`);
    const status = pick(['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'COMPLETED'] as const);
    await prisma.campaign.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        name: `Diwali Promo ${i + 1}`,
        description: 'Demo marketing campaign',
        status,
        channel: campaignChannels[i % 3]!,
        totalRecipients: randInt(100, 2000),
        sentCount: randInt(50, 2000),
        deliveredCount: randInt(40, 1900),
        scheduledAt: daysAhead(randInt(-30, 30)),
      },
    });
  }
  console.warn('  ✓ Campaigns (10)');

  // ─── Leads (15) ───────────────────────────────────────────
  const leadStatuses = ['NEW', 'NEW', 'CONTACTED', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const;
  for (let i = 0; i < 15; i++) {
    const id = did(`lead-${tenantId}-${i}`);
    const first = firstNames[i % firstNames.length]!;
    const last = lastNames[i % lastNames.length]!;
    await prisma.lead.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        firstName: first, lastName: last,
        phone: '+9197' + randInt(10000000, 99999999),
        email: `${first.toLowerCase()}.${last.toLowerCase()}.lead@example.com`,
        source: pick(['WALK_IN', 'REFERRAL', 'WEBSITE', 'SOCIAL_MEDIA', 'CAMPAIGN']),
        status: leadStatuses[i % leadStatuses.length]!,
        assignedTo: pick(staffUserIds),
        estimatedValuePaise: BigInt(randInt(25000, 500000) * 100),
        notes: 'Interested in bridal set',
      },
    });
  }
  console.warn('  ✓ Leads (15)');

  // ─── Loyalty transactions (20) ────────────────────────────
  for (let i = 0; i < 20; i++) {
    const id = did(`loy-${tenantId}-${i}`);
    const pts = randInt(50, 500);
    await prisma.loyaltyTransaction.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        customerId: customerIds[i % customerIds.length]!,
        transactionType: i % 4 === 0 ? 'REDEEMED' : 'EARNED',
        points: pts,
        balanceAfter: pts * (i + 1),
        description: 'Demo loyalty transaction',
      },
    });
  }
  console.warn('  ✓ Loyalty transactions (20)');

  // ─── CMS Banners (3) ──────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const id = did(`banner-${tenantId}-${i}`);
    await prisma.banner.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        title: ['Diwali Dhamaka', 'Wedding Season Sale', 'New Arrivals'][i]!,
        subtitle: 'Up to 30% off on making charges',
        imageUrl: `https://picsum.photos/seed/banner${i}/1600/600`,
        linkType: 'COLLECTION',
        position: 'HERO',
        displayOrder: i,
        isActive: true,
      },
    });
  }
  console.warn('  ✓ CMS banners (3)');

  // ─── Blog posts (8) ───────────────────────────────────────
  const blogTitles = [
    'Caring for your gold jewellery',
    'How to choose the right diamond',
    '5 tips for buying bridal sets',
    'Understanding BIS hallmarking',
    'Gold purity guide: 22K vs 18K',
    'Trending necklace styles in 2026',
    'Why HUID matters for resale',
    'Festival gifting ideas',
  ];
  for (let i = 0; i < blogTitles.length; i++) {
    const slug = blogTitles[i]!.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = did(`blog-${tenantId}-${slug}`);
    await prisma.blogPost.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        title: blogTitles[i]!,
        slug,
        excerpt: 'A short demo excerpt about ' + blogTitles[i]!.toLowerCase(),
        content: '<p>Lorem ipsum dolor sit amet. This is demo blog content.</p>'.repeat(6),
        coverImageUrl: `https://picsum.photos/seed/blog${i}/1200/600`,
        author: pick(firstNames) + ' ' + pick(lastNames),
        categoryTag: pick(['Care Tips', 'Guides', 'Trends', 'Compliance']),
        tags: ['gold', 'jewelry', 'guide'],
        readTimeMinutes: randInt(3, 10),
        isPublished: true,
        publishedAt: daysAgo(randInt(1, 60)),
        viewCount: randInt(50, 2000),
      },
    });
  }
  console.warn('  ✓ Blog posts (8)');

  // ─── Collections (5) ──────────────────────────────────────
  const collections = ['Bridal', 'Daily Wear', 'Festive', 'Children', 'Premium Diamond'];
  for (let i = 0; i < collections.length; i++) {
    const slug = collections[i]!.toLowerCase().replace(/ /g, '-');
    const id = did(`coll-${tenantId}-${slug}`);
    await prisma.collection.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        name: collections[i]!, slug,
        description: `${collections[i]} collection handpicked for the season`,
        imageUrl: `https://picsum.photos/seed/coll${i}/800/500`,
        isFeatured: i < 3,
        isActive: true,
        displayOrder: i,
        products: productIds.slice(i * 5, i * 5 + 10),
      },
    });
  }
  console.warn('  ✓ Collections (5)');

  // ─── Product reviews (30) ─────────────────────────────────
  for (let i = 0; i < 30; i++) {
    const id = did(`rev-${tenantId}-${i}`);
    await prisma.productReview.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        productId: productIds[i % productIds.length]!,
        customerName: pick(firstNames) + ' ' + pick(lastNames),
        rating: randInt(4, 5),
        title: pick(['Loved it!', 'Beautiful finish', 'Great quality', 'Exceeded expectations']),
        body: 'Demo review body. The jewellery looks stunning and the craftsmanship is excellent.',
        isVerified: true,
        isPublished: true,
        publishedAt: daysAgo(randInt(1, 60)),
      },
    });
  }
  console.warn('  ✓ Product reviews (30)');

  // ─── Wishlist entries (20) ────────────────────────────────
  for (let i = 0; i < 20; i++) {
    const id = did(`wish-${tenantId}-${i}`);
    const custId = customerIds[i % customerIds.length]!;
    const pid = productIds[(i * 7) % productIds.length]!;
    try {
      await prisma.wishlist.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId,
          customerId: custId,
          productId: pid,
          priceAtAddPaise: BigInt(randInt(10000, 200000) * 100),
        },
      });
    } catch {
      // unique constraint conflict -- skip
    }
  }
  console.warn('  ✓ Wishlist (20)');

  // ─── Abandoned carts (10) ─────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const id = did(`cart-${tenantId}-${i}`);
    await prisma.abandonedCart.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        cartSessionId: `sess-${i}-${did('cart' + i).slice(0, 8)}`,
        customerId: customerIds[i % customerIds.length]!,
        customerEmail: `abandoned${i}@example.com`,
        items: [{ productId: productIds[i]!, quantity: 1 }],
        totalPaise: BigInt(randInt(20000, 200000) * 100),
        itemCount: randInt(1, 3),
        abandonedAt: daysAgo(randInt(1, 7)),
        status: 'DETECTED',
      },
    });
  }
  console.warn('  ✓ Abandoned carts (10)');

  // ─── Metal rate history (5 entries x 2 metals) ────────────
  for (let i = 0; i < 5; i++) {
    const when = daysAgo(i);
    for (const metal of ['GOLD', 'SILVER'] as const) {
      const id = did(`rate-${metal}-${i}`);
      const perG = metal === 'GOLD' ? 6500 + randInt(-50, 50) : 82 + randInt(-2, 2);
      await prisma.metalRateHistory.upsert({
        where: { id },
        update: {},
        create: {
          id,
          metalType: metal,
          purity: metal === 'GOLD' ? 916 : 999,
          ratePerGramPaise: BigInt(perG * 100),
          ratePer10gPaise: BigInt(perG * 1000),
          ratePerTolaPaise: BigInt(Math.floor(perG * 11.664 * 100)),
          ratePerTroyOzPaise: BigInt(Math.floor(perG * 31.1035 * 100)),
          source: 'MCX',
          recordedAt: when,
        },
      });
    }
  }
  console.warn('  ✓ Metal rates (10)');

  // ─── Video consultations (8) ──────────────────────────────
  const vcStatuses = ['REQUESTED', 'REQUESTED', 'SCHEDULED', 'SCHEDULED', 'SCHEDULED', 'COMPLETED', 'COMPLETED', 'COMPLETED'];
  for (let i = 0; i < 8; i++) {
    const id = did(`vc-${tenantId}-${i}`);
    await prisma.videoConsultation.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        customerId: customerIds[i]!,
        requestedAt: daysAgo(randInt(1, 15)),
        scheduledAt: i > 1 ? daysAhead(randInt(1, 10)) : null,
        startedAt: i > 4 ? daysAgo(randInt(1, 5)) : null,
        endedAt: i > 4 ? daysAgo(randInt(0, 4)) : null,
        status: vcStatuses[i]!,
        meetingUrl: 'https://meet.example.com/demo-' + i,
        customerPhone: '+9198' + randInt(10000000, 99999999),
        preferredLang: pick(['en', 'hi', 'mr']),
        productsOfInterest: [{ productId: productIds[i]!, notes: 'customer interested' }],
      },
    });
  }
  console.warn('  ✓ Video consultations (8)');

  // ─── Payroll employees (5) + attendance + period ──────────
  const empIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const id = did(`emp-${tenantId}-${i}`);
    empIds.push(id);
    const basic = BigInt(randInt(20000, 40000) * 100);
    await prisma.employee.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        employeeCode: `EMP-${String(i + 1).padStart(4, '0')}`,
        firstName: pick(firstNames), lastName: pick(lastNames),
        joinedAt: daysAgo(randInt(100, 1500)),
        designation: pick(['Sales Executive', 'Cashier', 'Manager', 'Security', 'Accountant']),
        department: 'Retail',
        basicSalaryPaise: basic,
        hraPaise: basic * BigInt(40) / BigInt(100),
        daPaise: basic * BigInt(10) / BigInt(100),
        conveyancePaise: BigInt(1600 * 100),
        status: 'ACTIVE',
      },
    });
  }
  // one payroll period
  const periodId = did(`period-${tenantId}-2026-03`);
  await prisma.payrollPeriod.upsert({
    where: { id: periodId },
    update: {},
    create: {
      id: periodId, tenantId,
      periodLabel: '2026-03',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31'),
      status: 'PROCESSED',
      processedAt: new Date('2026-04-02'),
    },
  });
  for (let i = 0; i < empIds.length; i++) {
    const id = did(`payslip-${periodId}-${empIds[i]}`);
    const basic = BigInt(30000 * 100);
    const gross = basic * BigInt(150) / BigInt(100);
    const ded = gross * BigInt(12) / BigInt(100);
    await prisma.payslip.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        employeeId: empIds[i]!,
        payrollPeriodId: periodId,
        basicSalary: basic,
        hra: basic * BigInt(40) / BigInt(100),
        grossSalary: gross,
        pfDeduction: basic * BigInt(12) / BigInt(100),
        totalDeductions: ded,
        netSalary: gross - ded,
        workDays: 26,
        presentDays: 25,
        status: 'APPROVED',
      },
    });
  }
  console.warn('  ✓ Payroll (5 employees, 1 period, 5 payslips)');

  // ─── Hallmark center + 5 submissions ──────────────────────
  const centerId = did(`hmcenter-bis-mumbai`);
  try {
    await prisma.hallmarkCenter.upsert({
      where: { id: centerId },
      update: {},
      create: {
        id: centerId,
        centerCode: 'BIS-MUM-001',
        name: 'BIS Hallmarking Centre Mumbai',
        city: 'Mumbai', state: 'Maharashtra',
        bisLicenseNumber: 'CM/L-1234567',
      },
    });
  } catch {}
  for (let i = 0; i < 5; i++) {
    const id = did(`hmsub-${tenantId}-${i}`);
    try {
      await prisma.hallmarkSubmission.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId,
          submissionNumber: `HMS-DEMO-${String(i + 1).padStart(4, '0')}`,
          hallmarkCenterId: centerId,
          locationId: primaryLocId,
          status: 'COMPLETED',
          submittedDate: daysAgo(randInt(10, 60)),
          expectedReturnDate: daysAgo(randInt(1, 10)),
          actualReturnDate: daysAgo(randInt(0, 5)),
          totalItems: 10,
          passedItems: 10,
          failedItems: 0,
        },
      });
    } catch {}
  }
  console.warn('  ✓ Hallmark center + submissions (5)');

  // ─── Audit logs (20) ──────────────────────────────────────
  for (let i = 0; i < 20; i++) {
    const id = did(`audit-${tenantId}-${i}`);
    await prisma.auditLog.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        userId: pick(staffUserIds),
        action: pick(['CREATE', 'UPDATE', 'DELETE', 'LOGIN']),
        entityType: pick(['Sale', 'Product', 'Customer', 'Invoice', 'JobOrder']),
        entityId: did(`entity-${i}`),
        ipAddress: `10.0.${randInt(0, 255)}.${randInt(1, 254)}`,
        userAgent: 'Mozilla/5.0 Demo',
      },
    });
  }
  console.warn('  ✓ Audit logs (20)');

  console.warn('✔ Demo seed complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('✘ Demo seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
