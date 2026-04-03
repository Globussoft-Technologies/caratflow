import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple password hash for seeding (bcrypt would be used in production via the API)
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function main() {
  console.warn('Seeding CaratFlow database...');

  // ─── Currencies ────────────────────────────────────────────
  const currencies = [
    { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9', decimalPlaces: 2 },
    { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
    { code: 'AED', name: 'UAE Dirham', symbol: '\u062F.\u0625', decimalPlaces: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '\u00A3', decimalPlaces: 2 },
    { code: 'EUR', name: 'Euro', symbol: '\u20AC', decimalPlaces: 2 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
  ];

  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.warn('  Currencies seeded.');

  // ─── Countries ─────────────────────────────────────────────
  const countries = [
    { code: 'IN', name: 'India', currencyCode: 'INR', callingCode: '+91' },
    { code: 'US', name: 'United States', currencyCode: 'USD', callingCode: '+1' },
    { code: 'AE', name: 'United Arab Emirates', currencyCode: 'AED', callingCode: '+971' },
    { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', callingCode: '+44' },
    { code: 'SG', name: 'Singapore', currencyCode: 'SGD', callingCode: '+65' },
  ];

  for (const c of countries) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.warn('  Countries seeded.');

  // ─── Demo Tenant ───────────────────────────────────────────
  const tenantId = uuid();
  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: 'Sharma Jewellers Pvt. Ltd.',
      slug: 'sharma-jewellers',
      plan: 'professional',
      country: 'IN',
      defaultCurrency: 'INR',
      defaultTimezone: 'Asia/Kolkata',
      settings: {
        gstRegistered: true,
        gstinNumber: '27AABCS1429B1Z5',
        hallmarkEnabled: true,
        huidEnabled: true,
        financialYearStart: 4,
        weightUnit: 'g',
        defaultMetalPurity: 916,
      },
    },
  });
  console.warn('  Tenant seeded.');

  // ─── Admin Role ────────────────────────────────────────────
  const adminRoleId = uuid();
  await prisma.role.create({
    data: {
      id: adminRoleId,
      tenantId,
      name: 'Admin',
      description: 'Full system access',
      isSystem: true,
      permissions: {
        '*': ['create', 'read', 'update', 'delete'],
      },
    },
  });

  const managerRoleId = uuid();
  await prisma.role.create({
    data: {
      id: managerRoleId,
      tenantId,
      name: 'Manager',
      description: 'Branch manager access',
      isSystem: true,
      permissions: {
        'inventory.*': ['create', 'read', 'update'],
        'retail.*': ['create', 'read', 'update'],
        'crm.*': ['create', 'read', 'update'],
        'reports.*': ['read'],
      },
    },
  });

  const salesRoleId = uuid();
  await prisma.role.create({
    data: {
      id: salesRoleId,
      tenantId,
      name: 'Sales Associate',
      description: 'POS and customer-facing operations',
      isSystem: true,
      permissions: {
        'retail.sale': ['create', 'read'],
        'retail.estimate': ['create', 'read'],
        'inventory.stock': ['read'],
        'crm.customer': ['create', 'read', 'update'],
      },
    },
  });
  console.warn('  Roles seeded.');

  // ─── Admin User ────────────────────────────────────────────
  const passwordHash = await hashPassword('admin123');
  await prisma.user.create({
    data: {
      id: uuid(),
      tenantId,
      email: 'admin@sharmajewellers.com',
      passwordHash,
      firstName: 'Rajesh',
      lastName: 'Sharma',
      roleId: adminRoleId,
      preferences: {
        language: 'en',
        timezone: 'Asia/Kolkata',
        theme: 'light',
      },
    },
  });
  console.warn('  Admin user seeded.');

  // ─── Locations ─────────────────────────────────────────────
  const locations = [
    {
      id: uuid(),
      tenantId,
      name: 'Main Showroom - Zaveri Bazaar',
      locationType: 'SHOWROOM' as const,
      address: '123 Zaveri Bazaar, Kalbadevi',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      postalCode: '400002',
      phone: '+912222345678',
      email: 'showroom@sharmajewellers.com',
      settings: { isHeadOffice: true, hasWorkshop: false },
    },
    {
      id: uuid(),
      tenantId,
      name: 'Andheri Branch',
      locationType: 'SHOWROOM' as const,
      address: '45 Link Road, Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      postalCode: '400053',
      phone: '+912226789012',
      email: 'andheri@sharmajewellers.com',
      settings: { isHeadOffice: false, hasWorkshop: false },
    },
    {
      id: uuid(),
      tenantId,
      name: 'Workshop & Vault',
      locationType: 'WORKSHOP' as const,
      address: '78 SEEPZ, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      postalCode: '400096',
      phone: '+912228123456',
      email: 'workshop@sharmajewellers.com',
      settings: { isHeadOffice: false, hasWorkshop: true },
    },
  ];

  for (const loc of locations) {
    await prisma.location.create({ data: loc });
  }
  console.warn('  Locations seeded.');

  // ─── Categories ────────────────────────────────────────────
  const categoryData = [
    { name: 'Gold', sortOrder: 1 },
    { name: 'Silver', sortOrder: 2 },
    { name: 'Diamond', sortOrder: 3 },
    { name: 'Platinum', sortOrder: 4 },
    { name: 'Gemstone', sortOrder: 5 },
    { name: 'Kundan', sortOrder: 6 },
  ];

  const categoryIds: Record<string, string> = {};
  for (const cat of categoryData) {
    const id = uuid();
    categoryIds[cat.name] = id;
    await prisma.category.create({
      data: {
        id,
        tenantId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        description: `${cat.name} jewelry and ornaments`,
      },
    });
  }

  // Sub-categories for Gold
  const goldSubcats = ['Necklace', 'Ring', 'Bangle', 'Earring', 'Chain', 'Pendant', 'Mangalsutra'];
  for (let i = 0; i < goldSubcats.length; i++) {
    await prisma.category.create({
      data: {
        id: uuid(),
        tenantId,
        name: goldSubcats[i]!,
        parentId: categoryIds['Gold']!,
        sortOrder: i + 1,
      },
    });
  }
  console.warn('  Categories seeded.');

  console.warn('Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
