/**
 * CaratFlow Realistic Multi-Branch Seed
 * ------------------------------------------------------------
 * Populates the tenant `sharma-jewellers` with data that reads
 * like a real mid-size Indian jewellery chain.
 *
 * Fictional company profile:
 *   Shree Vama Jewellers Pvt Ltd
 *     - 10 showrooms across Indian metros
 *     - 3 manufacturing workshops (Rajkot, Surat, Sonari)
 *     - 1 central bullion vault (Mumbai)
 *     - ~30 employees, 500 customers, 500 products
 *     - ~800 sales over the last 12 months
 *
 * Idempotent: re-runs are safe. Uses deterministic SHA1-derived
 * IDs so every row upserts rather than duplicating.
 *
 * Every block is wrapped in try/catch so a single model-mismatch
 * does not halt the remaining categories.
 *
 * Usage:
 *   pnpm --filter @caratflow/db realistic-seed
 *   (or from repo root)  pnpm db:realistic-seed
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── Load DATABASE_URL from repo-root .env if unset ───────────
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

// ─── Deterministic UUID-shaped ID from any key string ─────────
function did(key: string): string {
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  return (
    hash.slice(0, 8) + '-' +
    hash.slice(8, 12) + '-' +
    '4' + hash.slice(13, 16) + '-' +
    '8' + hash.slice(17, 20) + '-' +
    hash.slice(20, 32)
  );
}

// ─── Seeded LCG (deterministic) ───────────────────────────────
let _rng = 1337;
function rseed(s: number) { _rng = s; }
function rand(): number {
  _rng = (_rng * 1103515245 + 12345) & 0x7fffffff;
  return _rng / 0x7fffffff;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]!; }
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysAhead(n: number): Date { const d = new Date(); d.setDate(d.getDate() + n); return d; }

// ─── Helpers ──────────────────────────────────────────────────
async function safely<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  try { return await fn(); } catch (e: any) {
    console.warn(`    ! ${label} failed: ${e?.message?.slice(0, 140) ?? e}`);
    return undefined;
  }
}

// ─── Data pools: realistic Indian names by region ─────────────
const firstMale = [
  'Arjun','Rahul','Vikram','Rohit','Amit','Suresh','Karan','Sanjay','Ravi','Nikhil',
  'Abhishek','Gaurav','Varun','Harsh','Rakesh','Vivek','Yash','Sameer','Hardik','Alok',
  'Deepak','Dev','Rohan','Anand','Mahesh','Kiran','Pranav','Ashok','Manish','Naveen',
  'Ramesh','Girish','Siddharth','Akash','Jignesh','Chirag','Bhavesh','Dhruv','Paresh','Tushar',
  'Prakash','Jayesh','Mukesh','Lalit','Dinesh','Govind','Bharat','Raj','Kunal','Sagar',
  'Aditya','Ashwin','Balaji','Chandrashekhar','Krishna','Lakshman','Murugan','Nandan','Padmanabh','Ranganathan',
  'Subramanian','Venkat','Saravanan','Dhanraj','Pranay','Anirudh','Ishaan','Kabir','Vihaan','Ayaan',
];
const firstFemale = [
  'Priya','Anjali','Sneha','Kavita','Neha','Deepa','Pooja','Meera','Divya','Shreya',
  'Swati','Ritika','Isha','Aarti','Simran','Pallavi','Tanya','Nisha','Komal','Megha',
  'Rhea','Bhavna','Aditi','Shruti','Payal','Suman','Sunita','Anita','Rekha','Geeta',
  'Lakshmi','Radha','Sita','Savitri','Janaki','Kamala','Parvati','Durga','Saraswati','Vidya',
  'Kirti','Nandini','Rashmi','Sarika','Bhavana','Trupti','Jyoti','Sushma','Asha','Usha',
];
const lastNames = [
  'Sharma','Patel','Kumar','Shah','Gupta','Mehta','Agarwal','Singh','Reddy','Iyer',
  'Nair','Joshi','Desai','Kapoor','Malhotra','Chopra','Bansal','Rao','Menon','Bhatt',
  'Trivedi','Pandya','Vyas','Dave','Oza','Parikh','Jain','Agrawal','Mittal','Khanna',
  'Arora','Sethi','Grover','Thakur','Verma','Mishra','Tiwari','Dubey','Chauhan','Chaudhary',
  'Sen','Bose','Chatterjee','Banerjee','Mukherjee','Ghosh','Das','Dutta','Roy','Pal',
  'Iyengar','Krishnan','Raman','Ramachandran','Subramaniam','Venkataraman','Pillai','Nambiar','Kurup','Panicker',
  'Deshpande','Kulkarni','Deshmukh','Jadhav','Patil','Kale','Gokhale','Phadke','Naik','Shetty',
];
const occupations = [
  'Cardiologist','Orthopedic Surgeon','Dentist','Software Engineer','Senior Manager',
  'Business Owner','Textile Merchant','Jeweller','Chartered Accountant','Bank Manager',
  'Homemaker','Principal','University Professor','IAS Officer','Advocate',
  'Film Producer','Stock Broker','Real Estate Developer','NRI (Dubai)','NRI (Singapore)',
  'NRI (USA)','Doctor','Retired Government Official','Insurance Agent','Pharmacist',
  'Restaurateur','Hotel Owner','Exporter','Cloth Trader','Diamond Merchant',
];

// ─── Showrooms and workshops ──────────────────────────────────
const showroomDefs: Array<{
  key: string; name: string; type: 'SHOWROOM' | 'WORKSHOP' | 'WAREHOUSE';
  city: string; state: string; stateCode: string; pin: string;
  address: string; phone: string; email: string;
  gstinPrefix: string; openingHours: string; sqft: number; isHQ?: boolean;
}> = [
  // 10 Showrooms
  { key: 'zaveri-bazaar-flagship', name: 'Shree Vama - Zaveri Bazaar Flagship', type: 'SHOWROOM',
    city: 'Mumbai', state: 'Maharashtra', stateCode: '27', pin: '400002',
    address: '142, Mumbadevi Road, Zaveri Bazaar, Kalbadevi',
    phone: '+912266012345', email: 'zaverbazaar@shreevama.com',
    gstinPrefix: '27', openingHours: '10:30-20:30', sqft: 8500, isHQ: true },
  { key: 'bandra-west', name: 'Shree Vama - Bandra West', type: 'SHOWROOM',
    city: 'Mumbai', state: 'Maharashtra', stateCode: '27', pin: '400050',
    address: '28 Linking Road, Bandra West',
    phone: '+912226401234', email: 'bandra@shreevama.com',
    gstinPrefix: '27', openingHours: '11:00-21:00', sqft: 4200 },
  { key: 'andheri-east', name: 'Shree Vama - Andheri East', type: 'SHOWROOM',
    city: 'Mumbai', state: 'Maharashtra', stateCode: '27', pin: '400069',
    address: 'Shop 4, Chakala Junction, Andheri Kurla Road',
    phone: '+912228321234', email: 'andheri@shreevama.com',
    gstinPrefix: '27', openingHours: '11:00-21:00', sqft: 3600 },
  { key: 'connaught-place', name: 'Shree Vama - Connaught Place', type: 'SHOWROOM',
    city: 'New Delhi', state: 'Delhi', stateCode: '07', pin: '110001',
    address: 'N-26 Connaught Circus, Inner Circle',
    phone: '+911123415678', email: 'cp@shreevama.com',
    gstinPrefix: '07', openingHours: '10:30-20:30', sqft: 5200 },
  { key: 'mg-road-bengaluru', name: 'Shree Vama - MG Road Bengaluru', type: 'SHOWROOM',
    city: 'Bengaluru', state: 'Karnataka', stateCode: '29', pin: '560001',
    address: '98 Mahatma Gandhi Road, opposite Brigade Road',
    phone: '+918025594321', email: 'mgroad@shreevama.com',
    gstinPrefix: '29', openingHours: '10:30-21:00', sqft: 4800 },
  { key: 't-nagar-chennai', name: 'Shree Vama - T Nagar Chennai', type: 'SHOWROOM',
    city: 'Chennai', state: 'Tamil Nadu', stateCode: '33', pin: '600017',
    address: '72 Ranganathan Street, T Nagar',
    phone: '+914428346789', email: 'tnagar@shreevama.com',
    gstinPrefix: '33', openingHours: '10:00-21:00', sqft: 5600 },
  { key: 'park-street-kolkata', name: 'Shree Vama - Park Street Kolkata', type: 'SHOWROOM',
    city: 'Kolkata', state: 'West Bengal', stateCode: '19', pin: '700016',
    address: '24A Park Street, near Flurys',
    phone: '+913322171234', email: 'parkstreet@shreevama.com',
    gstinPrefix: '19', openingHours: '10:30-20:30', sqft: 4100 },
  { key: 'banjara-hills-hyderabad', name: 'Shree Vama - Banjara Hills Hyderabad', type: 'SHOWROOM',
    city: 'Hyderabad', state: 'Telangana', stateCode: '36', pin: '500034',
    address: 'Road No 12, Banjara Hills',
    phone: '+914023354321', email: 'banjara@shreevama.com',
    gstinPrefix: '36', openingHours: '10:30-21:00', sqft: 4400 },
  { key: 'laxmi-road-pune', name: 'Shree Vama - Laxmi Road Pune', type: 'SHOWROOM',
    city: 'Pune', state: 'Maharashtra', stateCode: '27', pin: '411030',
    address: '1120 Laxmi Road, Shukrawar Peth',
    phone: '+912024451234', email: 'pune@shreevama.com',
    gstinPrefix: '27', openingHours: '10:30-20:30', sqft: 3200 },
  { key: 'mi-road-jaipur', name: 'Shree Vama - MI Road Jaipur', type: 'SHOWROOM',
    city: 'Jaipur', state: 'Rajasthan', stateCode: '08', pin: '302001',
    address: '45 Mirza Ismail Road, opposite Panch Batti',
    phone: '+911412365432', email: 'jaipur@shreevama.com',
    gstinPrefix: '08', openingHours: '10:30-20:30', sqft: 4900 },
  // 3 Workshops
  { key: 'rajkot-workshop', name: 'Shree Vama Rajkot Manufacturing Unit', type: 'WORKSHOP',
    city: 'Rajkot', state: 'Gujarat', stateCode: '24', pin: '360002',
    address: 'Plot 14, Aji GIDC, Phase II',
    phone: '+912812331234', email: 'rajkot.mfg@shreevama.com',
    gstinPrefix: '24', openingHours: '09:00-19:00', sqft: 12000 },
  { key: 'surat-workshop', name: 'Shree Vama Surat Diamond Workshop', type: 'WORKSHOP',
    city: 'Surat', state: 'Gujarat', stateCode: '24', pin: '395003',
    address: 'Surat Diamond Bourse, Tower B, 7th Floor',
    phone: '+912614001234', email: 'surat.mfg@shreevama.com',
    gstinPrefix: '24', openingHours: '09:00-18:00', sqft: 6500 },
  { key: 'sonari-bhuj-workshop', name: 'Shree Vama Sonari Bhuj Workshop', type: 'WORKSHOP',
    city: 'Bhuj', state: 'Gujarat', stateCode: '24', pin: '370001',
    address: 'Sonari Bazaar, near Prag Mahal',
    phone: '+912832251234', email: 'bhuj.mfg@shreevama.com',
    gstinPrefix: '24', openingHours: '09:30-18:00', sqft: 3800 },
  // 1 Central Bullion Vault
  { key: 'bkc-vault', name: 'Shree Vama Central Bullion Vault - BKC', type: 'WAREHOUSE',
    city: 'Mumbai', state: 'Maharashtra', stateCode: '27', pin: '400051',
    address: 'G Block, Bandra Kurla Complex, Tower 3, Level B2',
    phone: '+912266771234', email: 'vault@shreevama.com',
    gstinPrefix: '27', openingHours: '09:00-18:00 (by appt)', sqft: 2200 },
];

// ─── Product collections + categories ─────────────────────────
const collections = [
  { slug: 'vama-radha-bridal',    name: 'Vama Radha Bridal',    code: 'RADHA',   tier: 'bridal' },
  { slug: 'vrindavan-haar',       name: 'Vrindavan Haar',       code: 'VRIND',   tier: 'bridal' },
  { slug: 'rajputana-suite',      name: 'Rajputana Suite',      code: 'RAJPT',   tier: 'bridal' },
  { slug: 'mahalakshmi-temple',   name: 'Mahalakshmi Temple',   code: 'MLXMI',   tier: 'festive' },
  { slug: 'banarasi-meenakari',   name: 'Banarasi Meenakari',   code: 'MEENK',   tier: 'festive' },
  { slug: 'jaipuri-kundan',       name: 'Jaipuri Kundan',       code: 'KUNDN',   tier: 'bridal' },
  { slug: 'polki-classique',      name: 'Polki Classique',      code: 'POLKI',   tier: 'bridal' },
  { slug: 'daily-elegance',       name: 'Daily Elegance',       code: 'DAILY',   tier: 'daily' },
  { slug: 'solitaire-premium',    name: 'Solitaire Premium',    code: 'SOLIT',   tier: 'diamond' },
  { slug: 'silver-muse',          name: 'Silver Muse',          code: 'SILVR',   tier: 'silver' },
];

const productCats: Array<{
  cat: string; codeSku: string; hsn: string; grossRange: [number, number];
  designs: string[]; images: string[];
}> = [
  { cat: 'Mangalsutra', codeSku: 'MNG', hsn: '7113', grossRange: [12, 32],
    designs: ['Long Diamond Mangalsutra','Traditional Vati Mangalsutra','Heart Pendant Mangalsutra','Black Bead Chain'],
    images: ['https://loremflickr.com/640/640/mangalsutra,gold,jewelry?lock=1','https://loremflickr.com/640/640/mangalsutra,indian?lock=2'] },
  { cat: 'Bangle',      codeSku: 'BNG', hsn: '7113', grossRange: [14, 55],
    designs: ['Kada Pair','Bajuband','Diamond Bangle','Carved Filigree Bangle','Meenakari Bangle','Rajwadi Kada'],
    images: ['https://loremflickr.com/640/640/bangle,gold,kada?lock=3','https://loremflickr.com/640/640/bangles,indian?lock=4'] },
  { cat: 'Choker',      codeSku: 'CHK', hsn: '7113', grossRange: [40, 120],
    designs: ['Kundan Choker','Diamond Choker','Temple Choker','Polki Choker'],
    images: ['https://loremflickr.com/640/640/choker,kundan,gold?lock=5','https://loremflickr.com/640/640/necklace,bridal?lock=6'] },
  { cat: 'Necklace',    codeSku: 'NEC', hsn: '7113', grossRange: [25, 150],
    designs: ['Bridal Necklace Set','Peacock Motif Necklace','Layered Haar','Lakshmi Coin Necklace','Rani Haar'],
    images: ['https://loremflickr.com/640/640/necklace,gold,bridal?lock=7','https://loremflickr.com/640/640/haar,indian?lock=8'] },
  { cat: 'Earring',     codeSku: 'EAR', hsn: '7113', grossRange: [3, 22],
    designs: ['Jhumka','Chandbali','Diamond Stud','Kundan Earring','Polki Drop','Temple Jhumka','Peacock Chandbali'],
    images: ['https://loremflickr.com/640/640/jhumka,earring,gold?lock=9','https://loremflickr.com/640/640/earrings,kundan?lock=10'] },
  { cat: 'Ring',        codeSku: 'RNG', hsn: '7113', grossRange: [2, 12],
    designs: ['Solitaire Ring','Band Ring','Engagement Ring','Men Signet Ring','Cocktail Ring','Eternity Ring'],
    images: ['https://loremflickr.com/640/640/ring,diamond,gold?lock=11','https://loremflickr.com/640/640/ring,jewelry?lock=12'] },
  { cat: 'Tika',        codeSku: 'TKA', hsn: '7113', grossRange: [5, 18],
    designs: ['Maang Tikka','Matha Patti','Kundan Tikka','Polki Tikka'],
    images: ['https://loremflickr.com/640/640/tikka,maang,bridal?lock=13','https://loremflickr.com/640/640/tikka,indian?lock=14'] },
  { cat: 'Nathiya',     codeSku: 'NTH', hsn: '7113', grossRange: [2, 8],
    designs: ['Rajasthani Nath','Maharashtrian Nath','Small Nose Ring','Chain Nath'],
    images: ['https://loremflickr.com/640/640/nath,nose,ring?lock=15','https://loremflickr.com/640/640/nose,jewelry?lock=16'] },
  { cat: 'HaathPhool',  codeSku: 'HPH', hsn: '7113', grossRange: [10, 28],
    designs: ['Bridal Haath Phool','Kundan Haath Phool','Diamond Hand Harness'],
    images: ['https://loremflickr.com/640/640/haathphool,bridal?lock=17'] },
  { cat: 'Anklet',      codeSku: 'ANK', hsn: '7113', grossRange: [20, 55],
    designs: ['Payal Pair','Ghungroo Payal','Silver Anklet','Chain Payal'],
    images: ['https://loremflickr.com/640/640/payal,anklet,silver?lock=18'] },
  { cat: 'Chain',       codeSku: 'CHN', hsn: '7113', grossRange: [8, 35],
    designs: ['Box Chain','Rope Chain','Figaro Chain','Men Cuban Chain','Princess Chain'],
    images: ['https://loremflickr.com/640/640/chain,gold?lock=19'] },
];

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('▶ Shree Vama realistic seed starting...');

  // Resolve tenant (keep existing slug for login compatibility)
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'sharma-jewellers' } });
  if (!tenant) throw new Error('Base tenant "sharma-jewellers" not found. Run `pnpm db:seed` first.');
  const tenantId = tenant.id;

  // Update display name to Shree Vama
  await safely('rename tenant', () => prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: 'Shree Vama Jewellers Pvt Ltd',
      settings: {
        ...(tenant.settings as object ?? {}),
        gstRegistered: true,
        gstinNumber: '27AAACS9876A1Z5',
        hallmarkEnabled: true,
        huidEnabled: true,
        financialYearStart: 4,
        weightUnit: 'g',
        defaultMetalPurity: 916,
        displayName: 'Shree Vama Jewellers',
        companyTagline: 'Heirlooms since 1971',
      },
    },
  }));

  // Resolve roles
  const adminRole   = await prisma.role.findFirst({ where: { tenantId, name: 'Admin' } });
  const managerRole = await prisma.role.findFirst({ where: { tenantId, name: 'Manager' } });
  const salesRole   = await prisma.role.findFirst({ where: { tenantId, name: 'Sales Associate' } });
  if (!adminRole || !managerRole || !salesRole) throw new Error('Base roles not found. Run `pnpm db:seed` first.');

  // Create an Accountant role if missing
  let acctRole = await prisma.role.findFirst({ where: { tenantId, name: 'Accountant' } });
  if (!acctRole) {
    const accId = did(`role-${tenantId}-accountant`);
    acctRole = await prisma.role.upsert({
      where: { id: accId },
      update: {},
      create: {
        id: accId, tenantId, name: 'Accountant', description: 'Finance and accounting',
        isSystem: false,
        permissions: { 'financial.*': ['create', 'read', 'update'], 'reports.*': ['read'] },
      },
    });
  }
  console.log('  ✓ Roles resolved');

  // ─── Locations ────────────────────────────────────────────
  const locationIds: Record<string, string> = {};
  const locationMeta: Record<string, typeof showroomDefs[0]> = {};
  let locOk = 0;
  for (const l of showroomDefs) {
    const id = did(`loc-sv-${tenantId}-${l.key}`);
    locationIds[l.key] = id;
    locationMeta[l.key] = l;
    const gstin = `${l.gstinPrefix}AAACS9876A1Z${randInt(1, 9)}`;
    await safely(`location ${l.key}`, () => prisma.location.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, name: l.name, locationType: l.type,
        address: l.address, city: l.city, state: l.state, country: 'IN', postalCode: l.pin,
        phone: l.phone, email: l.email,
        settings: {
          gstin, openingHours: l.openingHours, sqft: l.sqft,
          isHeadOffice: !!l.isHQ,
          hasWorkshop: l.type === 'WORKSHOP',
          hasVault: l.type === 'WAREHOUSE',
        },
      },
    })).then(() => locOk++);
  }
  console.log(`  ✓ Locations (${locOk}/${showroomDefs.length})`);

  const showroomKeys = showroomDefs.filter(s => s.type === 'SHOWROOM').map(s => s.key);
  const workshopKeys = showroomDefs.filter(s => s.type === 'WORKSHOP').map(s => s.key);
  const vaultKey = 'bkc-vault';
  const primaryLocId = locationIds['zaveri-bazaar-flagship']!;
  const vaultId = locationIds[vaultKey]!;

  // ─── Staff users (30+) ────────────────────────────────────
  rseed(42);
  const staffPasswordHash = 'demo:' + crypto.createHash('sha256').update('demo123').digest('hex');

  type StaffDef = { first: string; last: string; roleId: string; title: string; branchKey?: string };
  const staffDefs: StaffDef[] = [
    // Head office
    { first: 'Jayant',   last: 'Shah',      roleId: adminRole.id,  title: 'CEO' },
    { first: 'Bhavesh',  last: 'Mehta',     roleId: adminRole.id,  title: 'CFO' },
    { first: 'Kiran',    last: 'Desai',     roleId: adminRole.id,  title: 'COO' },
    // 10 branch managers
    { first: 'Rakesh',   last: 'Shah',      roleId: managerRole.id, title: 'Branch Manager', branchKey: 'zaveri-bazaar-flagship' },
    { first: 'Neha',     last: 'Kapoor',    roleId: managerRole.id, title: 'Branch Manager', branchKey: 'bandra-west' },
    { first: 'Amit',     last: 'Joshi',     roleId: managerRole.id, title: 'Branch Manager', branchKey: 'andheri-east' },
    { first: 'Vikas',    last: 'Malhotra',  roleId: managerRole.id, title: 'Branch Manager', branchKey: 'connaught-place' },
    { first: 'Anand',    last: 'Iyer',      roleId: managerRole.id, title: 'Branch Manager', branchKey: 'mg-road-bengaluru' },
    { first: 'Saravanan',last: 'Krishnan',  roleId: managerRole.id, title: 'Branch Manager', branchKey: 't-nagar-chennai' },
    { first: 'Debashish',last: 'Banerjee',  roleId: managerRole.id, title: 'Branch Manager', branchKey: 'park-street-kolkata' },
    { first: 'Venkat',   last: 'Reddy',     roleId: managerRole.id, title: 'Branch Manager', branchKey: 'banjara-hills-hyderabad' },
    { first: 'Sachin',   last: 'Deshpande', roleId: managerRole.id, title: 'Branch Manager', branchKey: 'laxmi-road-pune' },
    { first: 'Mahipal',  last: 'Rathore',   roleId: managerRole.id, title: 'Branch Manager', branchKey: 'mi-road-jaipur' },
    // 3 workshop supervisors
    { first: 'Kirit',    last: 'Soni',      roleId: managerRole.id, title: 'Workshop Supervisor', branchKey: 'rajkot-workshop' },
    { first: 'Hasmukh',  last: 'Zaveri',    roleId: managerRole.id, title: 'Workshop Supervisor', branchKey: 'surat-workshop' },
    { first: 'Lakha',    last: 'Khatri',    roleId: managerRole.id, title: 'Workshop Supervisor', branchKey: 'sonari-bhuj-workshop' },
    // 15 senior sales (1-2 per showroom)
    { first: 'Pooja',    last: 'Trivedi',   roleId: salesRole.id, title: 'Senior Sales', branchKey: 'zaveri-bazaar-flagship' },
    { first: 'Suresh',   last: 'Pandya',    roleId: salesRole.id, title: 'Senior Sales', branchKey: 'zaveri-bazaar-flagship' },
    { first: 'Ritu',     last: 'Arora',     roleId: salesRole.id, title: 'Senior Sales', branchKey: 'bandra-west' },
    { first: 'Karan',    last: 'Sethi',     roleId: salesRole.id, title: 'Senior Sales', branchKey: 'andheri-east' },
    { first: 'Anjali',   last: 'Chopra',    roleId: salesRole.id, title: 'Senior Sales', branchKey: 'connaught-place' },
    { first: 'Manish',   last: 'Khanna',    roleId: salesRole.id, title: 'Senior Sales', branchKey: 'connaught-place' },
    { first: 'Divya',    last: 'Menon',     roleId: salesRole.id, title: 'Senior Sales', branchKey: 'mg-road-bengaluru' },
    { first: 'Lakshmi',  last: 'Iyengar',   roleId: salesRole.id, title: 'Senior Sales', branchKey: 't-nagar-chennai' },
    { first: 'Subramanian',last: 'Pillai',  roleId: salesRole.id, title: 'Senior Sales', branchKey: 't-nagar-chennai' },
    { first: 'Ananya',   last: 'Ghosh',     roleId: salesRole.id, title: 'Senior Sales', branchKey: 'park-street-kolkata' },
    { first: 'Srinivas', last: 'Rao',       roleId: salesRole.id, title: 'Senior Sales', branchKey: 'banjara-hills-hyderabad' },
    { first: 'Smita',    last: 'Kulkarni',  roleId: salesRole.id, title: 'Senior Sales', branchKey: 'laxmi-road-pune' },
    { first: 'Ramesh',   last: 'Choudhary', roleId: salesRole.id, title: 'Senior Sales', branchKey: 'mi-road-jaipur' },
    { first: 'Meena',    last: 'Agrawal',   roleId: salesRole.id, title: 'Senior Sales', branchKey: 'mi-road-jaipur' },
    { first: 'Nilesh',   last: 'Parikh',    roleId: salesRole.id, title: 'Senior Sales', branchKey: 'bandra-west' },
    // 4 accountants
    { first: 'Dharmesh', last: 'Vyas',      roleId: acctRole.id, title: 'Senior Accountant' },
    { first: 'Harshal',  last: 'Dave',      roleId: acctRole.id, title: 'Accountant' },
    { first: 'Priyanka', last: 'Gupta',     roleId: acctRole.id, title: 'Accountant' },
    { first: 'Aarav',    last: 'Bansal',    roleId: acctRole.id, title: 'Junior Accountant' },
  ];

  const staffUserIds: string[] = [];
  const staffByBranch: Record<string, string[]> = {};
  let staffOk = 0;
  for (const s of staffDefs) {
    const id = did(`sv-user-${tenantId}-${s.first}-${s.last}`);
    staffUserIds.push(id);
    if (s.branchKey) {
      staffByBranch[s.branchKey] = staffByBranch[s.branchKey] ?? [];
      staffByBranch[s.branchKey]!.push(id);
    }
    await safely(`staff ${s.first}`, () => prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        email: `${s.first.toLowerCase()}.${s.last.toLowerCase()}@shreevama.com`,
        passwordHash: staffPasswordHash,
        firstName: s.first, lastName: s.last,
        roleId: s.roleId,
        preferences: { title: s.title, branchKey: s.branchKey ?? null, demo: true },
      },
    })).then(() => staffOk++);
  }
  const defaultUserId = staffUserIds[0]!;
  console.log(`  ✓ Staff users (${staffOk})`);

  // ─── Customers (500) ──────────────────────────────────────
  const customerIds: string[] = [];
  const customerTiers: Record<string, string> = {};
  rseed(999);
  const tierDistribution = [
    ...Array(300).fill('BRONZE'),
    ...Array(140).fill('SILVER'),
    ...Array(50).fill('GOLD'),
    ...Array(10).fill('PLATINUM'),
  ];
  let custOk = 0;
  for (let i = 0; i < 500; i++) {
    const isFemale = i % 3 !== 0;
    const first = isFemale ? pick(firstFemale) : pick(firstMale);
    const last = pick(lastNames);
    const meta = pick(showroomDefs.filter(s => s.type === 'SHOWROOM'));
    const tier = tierDistribution[i]!;
    const id = did(`sv-cust-${tenantId}-${i}-${first}-${last}`);
    customerIds.push(id);
    customerTiers[id] = tier;
    const phone = '+9198' + String(76000000 + i * 137 + randInt(0, 90)).slice(-8);
    const emailSafe = first.toLowerCase().replace(/[^a-z]/g, '') + '.' + last.toLowerCase().replace(/[^a-z]/g, '') + (i + 1);
    const occupation = pick(occupations);

    await safely(`customer ${i}`, () => prisma.customer.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        firstName: first, lastName: last,
        email: `${emailSafe}@gmail.com`,
        phone,
        address: `${randInt(1, 999)}, ${pick(['Rose Villa','Shanti Niwas','Ganesh Apts','Krishna Bldg','Laxmi Heights','Orchid Park','Sagar Society'])}, near ${meta.address.split(',')[0]}`,
        city: meta.city, state: meta.state, country: 'IN', postalCode: meta.pin,
        customerType: tier === 'PLATINUM' ? 'WHOLESALE' : 'RETAIL',
        loyaltyPoints: tier === 'PLATINUM' ? randInt(25000, 100000)
                     : tier === 'GOLD'     ? randInt(5000, 20000)
                     : tier === 'SILVER'   ? randInt(1000, 5000) : randInt(0, 1000),
        loyaltyTier: tier,
        panNumber: tier === 'PLATINUM' || tier === 'GOLD' ? `${pick(['ABCDE','AAFPM','BKPSH','EPRSK','FXYZM'])}${randInt(1000, 9999)}${pick(['A','B','C','D','E'])}` : null,
        dateOfBirth: new Date(1950 + (i % 45), i % 12, (i % 27) + 1),
        anniversary: i % 2 === 0 ? new Date(1985 + (i % 35), (i + 3) % 12, ((i * 7) % 27) + 1) : null,
        preferences: {
          occupation,
          notifications: { whatsapp: true, sms: true, email: true },
          preferredLanguage: pick(['en', 'hi', 'mr', 'ta', 'te', 'gu', 'bn']),
          preferredBranch: meta.key,
          source: pick(['Walk-in', 'Referral', 'Website', 'Instagram', 'Wedding Expo']),
        },
        notes: tier === 'PLATINUM' ? 'VIP. Prefers private viewing. Anniversary gifts for wife every year.' : undefined,
      },
    })).then(() => custOk++);

    // ~5 occasions per customer avg
    for (let oc = 0; oc < 3; oc++) {
      if (rand() < 0.6) {
        const occId = did(`sv-occ-${id}-${oc}`);
        await safely(`occ ${id}-${oc}`, () => prisma.customerOccasion.upsert({
          where: { id: occId },
          update: {},
          create: {
            id: occId, tenantId, customerId: id,
            occasionType: pick(['BIRTHDAY','ANNIVERSARY','WEDDING','FESTIVAL']),
            date: daysAhead(randInt(1, 330)),
            description: pick([
              'Wife birthday gift', 'Anniversary surprise', 'Daughter wedding', 'Son engagement',
              'Diwali gift for mother', 'Karwachauth set', 'Akshaya Tritiya coin purchase',
            ]),
            reminderDaysBefore: 7,
          },
        }));
      }
    }
  }
  console.log(`  ✓ Customers (${custOk}/500) with occasions`);

  // ─── Categories (resolve) ─────────────────────────────────
  let anyCat = await prisma.category.findFirst({ where: { tenantId } });
  const defaultCategoryId = anyCat?.id ?? null;

  // ─── Products (500) ───────────────────────────────────────
  rseed(7777);
  type ProdRow = { id: string; sku: string; price: bigint; weightG: number; cat: string; collection: string };
  const products: ProdRow[] = [];
  let prodOk = 0;
  for (let i = 0; i < 500; i++) {
    const pc = productCats[i % productCats.length]!;
    const col = collections[i % collections.length]!;
    const design = pick(pc.designs);

    // Choose metal/purity based on collection
    const purityMap = [916, 750, 999, 585, 916, 916]; // weighted
    const purity = col.tier === 'silver' ? 925 : purityMap[i % purityMap.length]!;
    const purityLabel = purity === 916 ? '22K' : purity === 750 ? '18K' : purity === 585 ? '14K' : purity === 999 ? '24K' : '925';
    const productType = purity === 925 ? 'SILVER' : col.tier === 'diamond' ? 'DIAMOND' : 'GOLD';

    const weightG = randInt(pc.grossRange[0], pc.grossRange[1]);
    const grossMg = BigInt(weightG * 1000);
    const netMg = BigInt(Math.floor(weightG * 0.93 * 1000));

    // Realistic metal rates (Apr 2026 approx)
    const ratePerG = purity === 999 ? 7350 : purity === 916 ? 6750 : purity === 750 ? 5520
                   : purity === 585 ? 4295 : purity === 925 ? 92 : 6750;
    const metalValuePaise = BigInt(Math.floor(weightG * ratePerG * 100 * 0.93));

    // Making charges: pct or per-gram
    const makingPct = col.tier === 'bridal' ? randInt(18, 28) : col.tier === 'diamond' ? randInt(15, 22) : randInt(8, 14);
    const makingPaise = metalValuePaise * BigInt(makingPct) / BigInt(100);

    // Stones on diamond/kundan/polki collections
    const hasStones = ['diamond','bridal'].includes(col.tier);
    const stoneValuePaise = hasStones ? BigInt(randInt(15000, 400000) * 100) : BigInt(0);
    const sellingPaise = metalValuePaise + makingPaise + stoneValuePaise;

    const seq = String(Math.floor(i / productCats.length) + 1).padStart(3, '0');
    const sku = `SV-${pc.codeSku}-${col.code}-${seq}`;
    const huid = crypto.createHash('sha1').update(sku).digest('hex').slice(0, 6).toUpperCase();
    const id = did(`sv-prod-${tenantId}-${sku}`);
    const name = `${col.name} ${design}${purity === 925 ? ' (Silver 925)' : ` (${purityLabel})`}`;

    const images = [
      ...pc.images,
      `https://loremflickr.com/640/640/${pc.cat.toLowerCase()},${col.slug.split('-')[0]}?lock=${i + 100}`,
    ];

    products.push({ id, sku, price: sellingPaise, weightG, cat: pc.cat, collection: col.slug });

    await safely(`product ${sku}`, () => prisma.product.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, sku, name,
        description: `${design} from the ${col.name} collection. Crafted in ${purityLabel} ${productType === 'SILVER' ? 'silver' : 'gold'}. BIS hallmarked.${hasStones ? ' Premium certified stones with 4C grading.' : ''}`,
        categoryId: defaultCategoryId,
        productType: productType as any,
        metalPurity: purity,
        grossWeightMg: grossMg,
        netWeightMg: netMg,
        metalWeightMg: netMg,
        stoneWeightCt: hasStones ? randInt(50, 800) : null,
        makingCharges: makingPaise,
        wastagePercent: randInt(150, 450), // 1.5-4.5%
        huidNumber: huid,
        hallmarkNumber: `BIS-${huid}`,
        costPricePaise: BigInt(Math.floor(Number(sellingPaise) * 0.82)),
        sellingPricePaise: sellingPaise,
        images,
        attributes: {
          collection: col.slug,
          collectionName: col.name,
          purity: purityLabel,
          finish: pick(['Polished','Matte','Antique','High-shine','Dual-tone']),
          occasion: col.tier === 'bridal' ? 'Bridal'
                  : col.tier === 'festive' ? 'Festive'
                  : col.tier === 'diamond' ? 'Special Occasion'
                  : col.tier === 'silver' ? 'Daily Wear' : 'Daily Wear',
          gender: pc.cat === 'Chain' && rand() < 0.4 ? 'Men' : 'Women',
          stones: hasStones ? {
            mainStone: col.tier === 'diamond' ? 'Diamond' : pick(['Kundan','Polki','Uncut Diamond','Emerald','Ruby']),
            caratTotal: Number((randInt(50, 400) / 100).toFixed(2)),
            color: col.tier === 'diamond' ? pick(['D','E','F','G','H','I','J','K']) : null,
            clarity: col.tier === 'diamond' ? pick(['VVS1','VVS2','VS1','VS2','SI1','SI2']) : null,
            cut: col.tier === 'diamond' ? pick(['Round','Oval','Princess','Cushion','Emerald','Pear']) : null,
          } : null,
          isBridal: col.tier === 'bridal',
        },
        isActive: rand() < 0.94,
      },
    })).then(() => prodOk++);
  }
  console.log(`  ✓ Products (${prodOk}/500)`);

  // ─── Stock Items: distribute products across locations ────
  rseed(1111);
  let stockOk = 0;
  const locIdArr = showroomKeys.map(k => locationIds[k]!);
  for (let i = 0; i < products.length; i++) {
    const p = products[i]!;
    // Tier by weight: heavy bridal = few branches
    const isHeavy = p.weightG > 50;
    const isPopular = !isHeavy && i % 3 === 0;
    const branchCount = isHeavy ? randInt(2, 4) : isPopular ? 10 : randInt(2, 6);
    for (let b = 0; b < branchCount; b++) {
      const locId = locIdArr[(i * 7 + b) % locIdArr.length]!;
      const qty = isHeavy ? randInt(1, 2) : isPopular ? randInt(2, 12) : randInt(1, 5);
      const id = did(`sv-stock-${tenantId}-${p.id}-${locId}`);
      await safely(`stock ${p.sku}-${b}`, () => prisma.stockItem.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId, productId: p.id, locationId: locId,
          quantityOnHand: qty,
          reorderLevel: 2, reorderQuantity: 5,
          binLocation: `${pick(['A','B','C','D','E'])}${randInt(1, 40)}-${randInt(1, 8)}`,
        },
      })).then(() => stockOk++);
    }
  }
  console.log(`  ✓ Stock items (${stockOk})`);

  // ─── Metal Stock ──────────────────────────────────────────
  const metalAllocs: Array<{metal: 'GOLD'|'SILVER'|'PLATINUM'; purity: number; totalKg: number}> = [
    { metal: 'GOLD',     purity: 916, totalKg: 12 },
    { metal: 'GOLD',     purity: 750, totalKg: 4 },
    { metal: 'GOLD',     purity: 585, totalKg: 1 },
    { metal: 'SILVER',   purity: 925, totalKg: 60 },
    { metal: 'PLATINUM', purity: 950, totalKg: 0.5 },
  ];
  let metalOk = 0;
  for (const m of metalAllocs) {
    const totalMg = m.totalKg * 1_000_000;
    // 60% vault, 40% distributed among 10 showrooms
    const splits = [
      { locId: vaultId, frac: 0.60 },
      ...locIdArr.map(l => ({ locId: l, frac: 0.04 })),
    ];
    for (const s of splits) {
      const wMg = Math.floor(totalMg * s.frac);
      if (wMg < 1) continue;
      const ratePerG = m.metal === 'GOLD' ? (m.purity === 916 ? 6750 : m.purity === 750 ? 5520 : 4295)
                     : m.metal === 'SILVER' ? 92 : 3250;
      const valuePaise = BigInt(Math.floor((wMg / 1000) * ratePerG * 100));
      const id = did(`sv-metal-${tenantId}-${m.metal}-${m.purity}-${s.locId}`);
      await safely(`metal ${m.metal}-${m.purity}`, () => prisma.metalStock.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId, locationId: s.locId,
          metalType: m.metal as any, purityFineness: m.purity,
          weightMg: BigInt(wMg), valuePaise,
        },
      })).then(() => metalOk++);
    }
  }
  console.log(`  ✓ Metal stock (${metalOk})`);

  // ─── Gemstone Stock ───────────────────────────────────────
  const stoneDefs: Array<{type: string; color?: string; clarity?: string; cut?: string; shape?: string; pieces: number; ctPerPiece: [number, number]; pricePerCtRs: number}> = [
    { type: 'Diamond', color: 'D', clarity: 'VVS1', cut: 'Excellent', shape: 'Round',    pieces: 40, ctPerPiece: [30, 150], pricePerCtRs: 95000 },
    { type: 'Diamond', color: 'E', clarity: 'VVS2', cut: 'Very Good', shape: 'Round',    pieces: 60, ctPerPiece: [20, 100], pricePerCtRs: 75000 },
    { type: 'Diamond', color: 'F', clarity: 'VS1',  cut: 'Excellent', shape: 'Oval',     pieces: 50, ctPerPiece: [20, 80],  pricePerCtRs: 62000 },
    { type: 'Diamond', color: 'G', clarity: 'VS2',  cut: 'Very Good', shape: 'Princess', pieces: 80, ctPerPiece: [15, 75],  pricePerCtRs: 50000 },
    { type: 'Diamond', color: 'H', clarity: 'SI1',  cut: 'Good',      shape: 'Round',    pieces: 90, ctPerPiece: [10, 60],  pricePerCtRs: 38000 },
    { type: 'Diamond', color: 'I', clarity: 'SI2',  cut: 'Good',      shape: 'Cushion',  pieces: 100,ctPerPiece: [10, 50],  pricePerCtRs: 28000 },
    { type: 'Diamond', color: 'K', clarity: 'SI2',  cut: 'Fair',      shape: 'Pear',     pieces: 80, ctPerPiece: [5, 40],   pricePerCtRs: 18000 },
    { type: 'Kundan',                                                                          pieces: 200, ctPerPiece: [30, 200], pricePerCtRs: 6500 },
    { type: 'Emerald', color: 'Deep Green', clarity: 'Eye-clean',                              pieces: 150, ctPerPiece: [20, 120], pricePerCtRs: 12000 },
    { type: 'Ruby',    color: 'Pigeon Blood', clarity: 'VS',                                   pieces: 150, ctPerPiece: [15, 100], pricePerCtRs: 15000 },
    { type: 'Pearl',   color: 'South Sea',                                                     pieces: 100, ctPerPiece: [40, 160], pricePerCtRs: 4200 },
  ];
  let stoneOk = 0;
  for (let si = 0; si < stoneDefs.length; si++) {
    const s = stoneDefs[si]!;
    // distribute across 4 branches
    const branches = [vaultId, locationIds['surat-workshop']!, primaryLocId, locationIds['mi-road-jaipur']!];
    for (let b = 0; b < branches.length; b++) {
      const pieces = Math.ceil(s.pieces / branches.length);
      const ctPerPiece = Math.floor((s.ctPerPiece[0] + s.ctPerPiece[1]) / 2);
      const totalCt = pieces * ctPerPiece;
      const valuePaise = BigInt(Math.floor(totalCt / 100 * s.pricePerCtRs * 100));
      const id = did(`sv-stone-${tenantId}-${si}-${b}`);
      await safely(`stone ${s.type}-${si}-${b}`, () => prisma.stoneStock.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId, locationId: branches[b]!,
          stoneType: s.type,
          shape: s.shape ?? null, color: s.color ?? null, clarity: s.clarity ?? null,
          cutGrade: s.cut ?? null,
          totalWeightCt: totalCt, totalPieces: pieces, valuePaise,
          certificationNumber: si < 7 ? `GIA-${crypto.createHash('sha1').update(`cert-${si}-${b}`).digest('hex').slice(0, 10).toUpperCase()}` : null,
        },
      })).then(() => stoneOk++);
    }
  }
  console.log(`  ✓ Stone stock (${stoneOk})`);

  // ─── Suppliers (15) ───────────────────────────────────────
  const supplierDefs: Array<{name: string; type: 'BULLION'|'MANUFACTURER'|'WHOLESALER'; city: string; state: string; stateCode: string; contact: string}> = [
    { name: 'MMTC-PAMP India Pvt Ltd',       type: 'BULLION',     city: 'Gurugram', state: 'Haryana', stateCode: '06', contact: 'Saurabh Dhingra' },
    { name: 'RBCD Bullion Trading',          type: 'BULLION',     city: 'Mumbai',   state: 'Maharashtra', stateCode: '27', contact: 'Rajesh Mehta' },
    { name: 'Bombay Bullion Association',    type: 'BULLION',     city: 'Mumbai',   state: 'Maharashtra', stateCode: '27', contact: 'Surendra Mehta' },
    { name: 'Rosy Blue (India) Pvt Ltd',     type: 'WHOLESALER',  city: 'Mumbai',   state: 'Maharashtra', stateCode: '27', contact: 'Dilip Mehta' },
    { name: 'B. Arunkumar & Company',        type: 'WHOLESALER',  city: 'Mumbai',   state: 'Maharashtra', stateCode: '27', contact: 'Vipul Shah' },
    { name: 'Kiran Gems Pvt Ltd',            type: 'WHOLESALER',  city: 'Surat',    state: 'Gujarat', stateCode: '24', contact: 'Mavji Patel' },
    { name: 'Shree Ramkrishna Exports',      type: 'WHOLESALER',  city: 'Surat',    state: 'Gujarat', stateCode: '24', contact: 'Govind Dholakia' },
    { name: 'Hari Krishna Exports',          type: 'WHOLESALER',  city: 'Surat',    state: 'Gujarat', stateCode: '24', contact: 'Savji Dholakia' },
    { name: 'Kirti Jewels Mfg',              type: 'MANUFACTURER',city: 'Jaipur',   state: 'Rajasthan', stateCode: '08', contact: 'Kiran Pareek' },
    { name: 'Emerald Jewels India',          type: 'MANUFACTURER',city: 'Chennai',  state: 'Tamil Nadu', stateCode: '33', contact: 'K Srinivasan' },
    { name: 'Kalyan Silk & Gold',            type: 'WHOLESALER',  city: 'Thrissur', state: 'Kerala', stateCode: '32', contact: 'T S Kalyanaraman' },
    { name: 'PC Jeweller Bullion Division',  type: 'BULLION',     city: 'New Delhi',state: 'Delhi', stateCode: '07', contact: 'Padam Gupta' },
    { name: 'Tanishq Precious Metals',       type: 'BULLION',     city: 'Bengaluru',state: 'Karnataka', stateCode: '29', contact: 'Revathi Kant' },
    { name: 'Malabar Gold Supplies',         type: 'BULLION',     city: 'Kozhikode',state: 'Kerala', stateCode: '32', contact: 'M P Ahammed' },
    { name: 'Sonari Bullion Traders',        type: 'BULLION',     city: 'Rajkot',   state: 'Gujarat', stateCode: '24', contact: 'Jethalal Champaklal' },
  ];
  const supplierIds: string[] = [];
  let supOk = 0;
  for (let i = 0; i < supplierDefs.length; i++) {
    const s = supplierDefs[i]!;
    const id = did(`sv-sup-${tenantId}-${s.name}`);
    supplierIds.push(id);
    const gstin = `${s.stateCode}AAACS${randInt(1000, 9999)}${pick(['Q','R','S','T'])}1Z${randInt(1, 9)}`;
    await safely(`supplier ${s.name}`, () => prisma.supplier.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, name: s.name,
        contactPerson: s.contact,
        email: `accounts@${s.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 16)}.com`,
        phone: '+9198' + randInt(10000000, 99999999),
        gstinNumber: gstin,
        panNumber: `AAACS${randInt(1000, 9999)}${pick(['Q','R','S'])}`,
        city: s.city, state: s.state, country: 'IN',
        supplierType: s.type as any,
        rating: randInt(3, 5),
      },
    })).then(() => supOk++);
  }
  console.log(`  ✓ Suppliers (${supOk}/15)`);

  // ─── Karigars (15) with specializations ──────────────────
  const karigarDefs = [
    { first: 'Jethalal',    last: 'Soni',       spec: 'Jadau Master',        level: 'MASTER', loc: 'sonari-bhuj-workshop' },
    { first: 'Govind',      last: 'Jadav',      spec: 'Jadau Master',        level: 'MASTER', loc: 'sonari-bhuj-workshop' },
    { first: 'Madhav',      last: 'Khatri',     spec: 'Jadau Master',        level: 'MASTER', loc: 'sonari-bhuj-workshop' },
    { first: 'Rakesh',      last: 'Meenawala',  spec: 'Kundan Specialist',   level: 'SENIOR', loc: 'rajkot-workshop' },
    { first: 'Dinesh',      last: 'Sonkar',     spec: 'Kundan Specialist',   level: 'SENIOR', loc: 'rajkot-workshop' },
    { first: 'Kiran',       last: 'Verma',      spec: 'Kundan Specialist',   level: 'SENIOR', loc: 'rajkot-workshop' },
    { first: 'Vishwanath',  last: 'Pande',      spec: 'Meenakari Artist',    level: 'MASTER', loc: 'rajkot-workshop' },
    { first: 'Prakash',     last: 'Chitrakar',  spec: 'Meenakari Artist',    level: 'SENIOR', loc: 'rajkot-workshop' },
    { first: 'Rameshbhai',  last: 'Zaveri',     spec: 'Diamond Setter',      level: 'MASTER', loc: 'surat-workshop' },
    { first: 'Jayesh',      last: 'Patel',      spec: 'Diamond Setter',      level: 'SENIOR', loc: 'surat-workshop' },
    { first: 'Mukesh',      last: 'Chudasama',  spec: 'Diamond Setter',      level: 'SENIOR', loc: 'surat-workshop' },
    { first: 'Hariprasad',  last: 'Goswami',    spec: 'Goldsmith',           level: 'SENIOR', loc: 'rajkot-workshop' },
    { first: 'Champaklal',  last: 'Soni',       spec: 'Goldsmith',           level: 'MASTER', loc: 'rajkot-workshop' },
    { first: 'Manoj',       last: 'Bhanushali', spec: 'Polki Expert',        level: 'MASTER', loc: 'surat-workshop' },
    { first: 'Suresh',      last: 'Dave',       spec: 'Polki Expert',        level: 'SENIOR', loc: 'surat-workshop' },
  ];
  const karigarIds: string[] = [];
  let karOk = 0;
  for (let i = 0; i < karigarDefs.length; i++) {
    const k = karigarDefs[i]!;
    const id = did(`sv-karigar-${tenantId}-${k.first}-${k.last}`);
    karigarIds.push(id);
    await safely(`karigar ${k.first}`, () => prisma.karigar.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        employeeCode: `SVK-${String(i + 1).padStart(3, '0')}`,
        firstName: k.first, lastName: k.last,
        phone: '+9199' + randInt(10000000, 99999999),
        specialization: k.spec,
        skillLevel: k.level as any,
        dailyWagePaise: BigInt((k.level === 'MASTER' ? randInt(2500, 4000) : randInt(1200, 2200)) * 100),
        locationId: locationIds[k.loc]!,
        joiningDate: daysAgo(randInt(200, 4000)),
      },
    })).then(() => karOk++);
  }
  console.log(`  ✓ Karigars (${karOk}/15)`);

  // Karigar metal balances
  for (let i = 0; i < karigarIds.length; i++) {
    const id = did(`sv-karbal-${karigarIds[i]}`);
    await safely(`karigar balance ${i}`, () => (prisma as any).karigarMetalBalance?.upsert?.({
      where: { id },
      update: {},
      create: {
        id, tenantId, karigarId: karigarIds[i]!,
        metalType: 'GOLD',
        purityFineness: 916,
        issuedWeightMg: BigInt(randInt(50, 300) * 1000),
        returnedWeightMg: BigInt(randInt(40, 250) * 1000),
        wastedWeightMg: BigInt(randInt(500, 3000)),
        currentBalanceMg: BigInt(randInt(1000, 30000)),
      },
    }));
  }

  // ─── BOMs (20) ────────────────────────────────────────────
  const bomIds: string[] = [];
  let bomOk = 0;
  for (let i = 0; i < 20; i++) {
    const p = products[i * 5]!;
    const id = did(`sv-bom-${tenantId}-${i}`);
    bomIds.push(id);
    await safely(`bom ${i}`, () => prisma.billOfMaterials.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        name: `BOM - ${p.sku}`,
        productId: p.id,
        status: 'ACTIVE',
        estimatedCostPaise: p.price * BigInt(82) / BigInt(100),
        estimatedTimeMins: randInt(180, 1200),
        notes: 'Standard production formula including stones, finishing, polish, QC',
      },
    })).then(() => bomOk++);
  }
  console.log(`  ✓ BOMs (${bomOk}/20)`);

  // ─── Job Orders (50+) ─────────────────────────────────────
  const jobStatusDist: Array<'DRAFT'|'PLANNED'|'MATERIAL_ISSUED'|'IN_PROGRESS'|'QC_PENDING'|'QC_PASSED'|'COMPLETED'|'CANCELLED'> = [
    'DRAFT','PLANNED','PLANNED','MATERIAL_ISSUED','IN_PROGRESS','IN_PROGRESS','IN_PROGRESS',
    'QC_PENDING','QC_PASSED','COMPLETED','COMPLETED','COMPLETED','CANCELLED',
  ];
  let jobOk = 0;
  for (let i = 0; i < 55; i++) {
    const p = products[i * 3 % products.length]!;
    const id = did(`sv-job-${tenantId}-${i}`);
    const status = jobStatusDist[i % jobStatusDist.length]!;
    const isBridal = p.collection.includes('radha') || p.collection.includes('kundan') || p.collection.includes('polki');
    const karigarId = karigarIds[i % karigarIds.length]!;
    const wsLoc = locationIds[workshopKeys[i % workshopKeys.length]!]!;
    const customerId = isBridal && rand() < 0.6 ? customerIds[i * 13 % customerIds.length]! : null;
    await safely(`job ${i}`, () => prisma.jobOrder.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        jobNumber: `SV-JOB-${String(i + 1).padStart(5, '0')}`,
        productId: p.id,
        customerId,
        bomId: i < bomIds.length ? bomIds[i]! : null,
        locationId: wsLoc,
        status,
        priority: isBridal ? pick(['HIGH','URGENT']) : pick(['LOW','MEDIUM','MEDIUM','HIGH']),
        quantity: isBridal ? 1 : randInt(1, 5),
        assignedKarigarId: karigarId,
        estimatedStartDate: daysAgo(randInt(5, 45)),
        estimatedEndDate: daysAhead(randInt(-10, 60)),
        notes: isBridal ? `Bridal commission for ${p.sku}` : `Stock refill - ${p.cat}`,
        specialInstructions: isBridal
          ? 'Customer preference: Heirloom finish, traditional hand-setting'
          : 'Standard polish, BIS hallmark required',
      },
    })).then(() => jobOk++);
  }
  console.log(`  ✓ Job orders (${jobOk}/55)`);

  // ─── Sales (800+) over last 12 months ─────────────────────
  rseed(31415);
  const smallBranches = ['andheri-east','laxmi-road-pune','bandra-west'];
  const bigBranches   = ['zaveri-bazaar-flagship','connaught-place','mg-road-bengaluru','t-nagar-chennai','mi-road-jaipur'];
  const repeatCustomers = customerIds.slice(0, 150); // 30%

  function pickBranchForValue(totalPaise: bigint): string {
    const r = rand();
    if (totalPaise > BigInt(500_000 * 100)) {
      return pick(bigBranches);
    }
    if (r < 0.4) return pick(bigBranches);
    return pick([...bigBranches, ...smallBranches, 'park-street-kolkata','banjara-hills-hyderabad']);
  }

  // Build sale distribution: ~800 total over 365 days
  const salesToMake: Array<{daysAgoN: number; bucket: 'small'|'mid'|'high'}> = [];
  for (let day = 0; day < 365; day++) {
    const d = daysAgo(day);
    const dow = d.getDay();
    const mo = d.getMonth(); // 0-11
    const dom = d.getDate();
    let count = dow === 0 || dow === 6 ? randInt(3, 6) : randInt(1, 3);
    // festival peaks
    // Akshaya Tritiya ~ Apr 22-24
    if (mo === 3 && dom >= 22 && dom <= 24) count = randInt(8, 14);
    // Diwali Oct-Nov
    if ((mo === 9 && dom >= 20) || (mo === 10 && dom <= 10)) count = randInt(6, 12);
    // Wedding season Nov-Feb
    if (mo === 10 || mo === 11 || mo === 0 || mo === 1) count = Math.max(count, randInt(3, 7));
    for (let c = 0; c < count; c++) {
      const roll = rand();
      const bucket: 'small'|'mid'|'high' = roll < 0.50 ? 'small' : roll < 0.85 ? 'mid' : 'high';
      salesToMake.push({ daysAgoN: day, bucket });
    }
  }
  // cap at ~830
  while (salesToMake.length > 830) salesToMake.pop();

  let saleOk = 0;
  for (let i = 0; i < salesToMake.length; i++) {
    const s = salesToMake[i]!;
    const saleId = did(`sv-sale-${tenantId}-${i}`);
    const when = daysAgo(s.daysAgoN);

    // Pick 1-3 products matching bucket
    const targetMin = s.bucket === 'small' ? 1500000 : s.bucket === 'mid' ? 8000000 : 50000000; // paise
    const targetMax = s.bucket === 'small' ? 8000000 : s.bucket === 'mid' ? 50000000 : 500000000;
    let tries = 0;
    const chosen: ProdRow[] = [];
    let sum = BigInt(0);
    while (chosen.length < randInt(1, 3) && tries < 15) {
      const cand = products[randInt(0, products.length - 1)]!;
      if (Number(cand.price) >= targetMin / (chosen.length + 1) && Number(cand.price) <= targetMax) {
        chosen.push(cand);
        sum += cand.price;
      }
      tries++;
    }
    if (chosen.length === 0) chosen.push(products[i % products.length]!), sum += products[i % products.length]!.price;

    // Pick customer: 30% repeat
    const custId = rand() < 0.3 ? pick(repeatCustomers) : customerIds[i % customerIds.length]!;
    const branchKey = pickBranchForValue(sum);
    const branchMeta = locationMeta[branchKey]!;
    const locId = locationIds[branchKey]!;
    const userId = staffByBranch[branchKey]?.[0] ?? defaultUserId;

    // tax
    const cust = await safely('cust state', () => prisma.customer.findUnique({ where: { id: custId }, select: { state: true } }));
    const isInterstate = cust?.state && cust.state !== branchMeta.state;

    let subtotal = BigInt(0);
    let cgstTot = BigInt(0), sgstTot = BigInt(0), igstTot = BigInt(0);
    const lines = chosen.map((p, j) => {
      const unit = p.price;
      const lineBase = unit;
      const gstTotal = lineBase * BigInt(300) / BigInt(10000); // 3%
      let cgst = BigInt(0), sgst = BigInt(0), igst = BigInt(0);
      if (isInterstate) { igst = gstTotal; igstTot += igst; }
      else { cgst = gstTotal / BigInt(2); sgst = gstTotal - cgst; cgstTot += cgst; sgstTot += sgst; }
      const total = lineBase + cgst + sgst + igst;
      subtotal += lineBase;
      return { id: did(`sv-sli-${saleId}-${j}`), p, unit, cgst, sgst, igst, total };
    });

    // 20% old gold exchange
    const oldGoldExchange = rand() < 0.2;
    const discount = oldGoldExchange ? subtotal * BigInt(randInt(5, 18)) / BigInt(100) : (rand() < 0.15 ? subtotal * BigInt(3) / BigInt(100) : BigInt(0));
    const total = subtotal + cgstTot + sgstTot + igstTot - discount;

    // Payment mix
    const payMethods: Array<{method: 'CASH'|'CARD'|'UPI'|'BANK_TRANSFER'|'CREDIT'|'OLD_GOLD'; amt: bigint}> = [];
    if (oldGoldExchange) {
      const ogAmt = total * BigInt(randInt(15, 35)) / BigInt(100);
      payMethods.push({ method: 'OLD_GOLD', amt: ogAmt });
      const rest = total - ogAmt;
      if (rest > 0) {
        // split rest
        if (rand() < 0.5) payMethods.push({ method: 'CARD', amt: rest });
        else { payMethods.push({ method: 'UPI', amt: rest / BigInt(2) }); payMethods.push({ method: 'CASH', amt: rest - rest / BigInt(2) }); }
      }
    } else {
      const r = rand();
      if (r < 0.3) payMethods.push({ method: 'CARD', amt: total });
      else if (r < 0.55) payMethods.push({ method: 'UPI', amt: total });
      else if (r < 0.75) payMethods.push({ method: 'CASH', amt: total });
      else if (r < 0.90) { payMethods.push({ method: 'UPI', amt: total / BigInt(2) }); payMethods.push({ method: 'CARD', amt: total - total / BigInt(2) }); }
      else payMethods.push({ method: 'BANK_TRANSFER', amt: total });
    }

    await safely(`sale ${i}`, () => prisma.sale.create({
      data: {
        id: saleId, tenantId,
        saleNumber: `SV-INV-${String(i + 1).padStart(6, '0')}`,
        customerId: custId,
        locationId: locId,
        userId,
        status: 'COMPLETED',
        subtotalPaise: subtotal,
        discountPaise: discount,
        taxPaise: cgstTot + sgstTot + igstTot,
        totalPaise: total,
        createdAt: when, updatedAt: when,
        notes: oldGoldExchange ? 'With old gold exchange' : undefined,
        lineItems: {
          create: lines.map((li) => ({
            id: li.id, tenantId,
            productId: li.p.id,
            description: `${li.p.cat} - ${li.p.sku}`,
            quantity: 1,
            unitPricePaise: li.unit,
            makingChargesPaise: li.unit * BigInt(15) / BigInt(100),
            metalWeightMg: BigInt(li.p.weightG * 1000),
            lineTotalPaise: li.total,
            cgstPaise: li.cgst, sgstPaise: li.sgst, igstPaise: li.igst,
            gstRate: 300,
            hsnCode: '7113',
          })),
        },
        payments: {
          create: payMethods.map((pm, k) => ({
            id: did(`sv-pay-${saleId}-${k}`),
            tenantId,
            method: pm.method as any,
            amountPaise: pm.amt,
            status: 'COMPLETED',
            processedAt: when,
          })),
        },
      },
    })).then(() => { if (saleOk === 0 || saleOk % 100 === 0) process.stdout.write(`    sales ${saleOk}...\r`); saleOk++; });
  }
  console.log(`  ✓ Sales (${saleOk}/${salesToMake.length})`);

  // ─── Purchase Orders (60) ─────────────────────────────────
  const poStatuses = ['DRAFT','SENT','PARTIALLY_RECEIVED','RECEIVED','RECEIVED','RECEIVED'] as const;
  const poIds: string[] = [];
  let poOk = 0;
  for (let i = 0; i < 60; i++) {
    const id = did(`sv-po-${tenantId}-${i}`);
    poIds.push(id);
    const supId = supplierIds[i % supplierIds.length]!;
    const locId = locationIds[pick([...showroomKeys, ...workshopKeys])]!;
    const subtotal = BigInt(randInt(100000, 5000000) * 100);
    const tax = subtotal * BigInt(3) / BigInt(100);
    const total = subtotal + tax;
    const status = poStatuses[i % poStatuses.length]!;
    await safely(`po ${i}`, () => prisma.purchaseOrder.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        poNumber: `SV-PO-${String(i + 1).padStart(5, '0')}`,
        supplierId: supId, locationId: locId,
        status, subtotalPaise: subtotal, taxPaise: tax, totalPaise: total,
        expectedDate: daysAhead(randInt(-60, 30)),
        notes: i % 5 === 0 ? 'Diwali stocking order' : 'Regular procurement',
        items: {
          create: [{
            id: did(`sv-po-item-${id}-1`), tenantId,
            description: pick(['22K Gold bar 100g','18K Gold granules','Loose diamonds VVS mix','Cut & polished emeralds','Silver 999 1kg bar']),
            quantity: randInt(1, 30),
            unitPricePaise: subtotal / BigInt(randInt(1, 30)),
            totalPaise: subtotal,
            weightMg: BigInt(randInt(50, 5000) * 1000),
            purityFineness: pick([916, 750, 999]),
          }],
        },
      },
    })).then(() => poOk++);
  }
  console.log(`  ✓ Purchase orders (${poOk}/60)`);

  // ─── Goods Receipts (40) ──────────────────────────────────
  let grOk = 0;
  for (let i = 0; i < 40; i++) {
    const id = did(`sv-gr-${tenantId}-${i}`);
    const poId = poIds[i]!;
    await safely(`gr ${i}`, async () => {
      const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
      if (!po) return;
      return prisma.goodsReceipt.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId,
          receiptNumber: `SV-GR-${String(i + 1).padStart(5, '0')}`,
          purchaseOrderId: poId,
          supplierId: po.supplierId,
          locationId: po.locationId,
          status: 'COMPLETED' as any,
          receivedDate: daysAgo(randInt(1, 60)),
          notes: 'Received in good condition',
        },
      });
    }).then(() => grOk++);
  }
  console.log(`  ✓ Goods receipts (${grOk}/40)`);

  // ─── Invoices (add ~600 sales-related + supplier) ─────────
  let invOk = 0;
  for (let i = 0; i < 100; i++) {
    const id = did(`sv-inv-${tenantId}-${i}`);
    const isSales = i < 70;
    const subtotal = BigInt(randInt(50000, 800000) * 100);
    const tax = subtotal * BigInt(3) / BigInt(100);
    const total = subtotal + tax;
    const statuses = ['PAID','PAID','PAID','SENT','PARTIALLY_PAID','OVERDUE'] as const;
    const status = statuses[i % statuses.length]!;
    await safely(`invoice ${i}`, () => prisma.invoice.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        invoiceNumber: `SV-${isSales ? 'SI' : 'PI'}-${String(i + 1).padStart(5, '0')}`,
        invoiceType: (isSales ? 'SALES' : 'PURCHASE') as any,
        customerId: isSales ? customerIds[i % customerIds.length]! : null,
        supplierId: isSales ? null : supplierIds[i % supplierIds.length]!,
        locationId: primaryLocId,
        status,
        subtotalPaise: subtotal,
        taxPaise: tax,
        totalPaise: total,
        paidPaise: status === 'PAID' ? total : status === 'PARTIALLY_PAID' ? total / BigInt(2) : BigInt(0),
        dueDate: daysAhead(randInt(-60, 45)),
      },
    })).then(() => invOk++);
  }
  console.log(`  ✓ Invoices (${invOk}/100)`);

  // ─── Bank accounts (3) ────────────────────────────────────
  const bankDefs = [
    { bankName: 'HDFC Bank', branch: 'Zaveri Bazaar', acct: '50200012345678', ifsc: 'HDFC0000123', bal: 45000000_00 },
    { bankName: 'Axis Bank', branch: 'BKC',           acct: '923020012345678', ifsc: 'UTIB0000456', bal: 28000000_00 },
    { bankName: 'SBI',       branch: 'Fort Mumbai',   acct: '30145678901',     ifsc: 'SBIN0000789', bal: 15000000_00 },
  ];
  let bankOk = 0;
  const anyAccount = await prisma.account.findFirst({ where: { tenantId } });
  if (anyAccount) {
    for (let i = 0; i < bankDefs.length; i++) {
      const b = bankDefs[i]!;
      const id = did(`sv-bank-${tenantId}-${i}`);
      await safely(`bank ${b.bankName}`, () => prisma.bankAccount.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId,
          accountId: anyAccount.id,
          bankName: b.bankName,
          accountNumber: b.acct,
          ifscCode: b.ifsc,
          branchName: b.branch,
          currentBalancePaise: BigInt(b.bal),
          isDefault: i === 0,
        },
      })).then(() => bankOk++);
    }
  }
  console.log(`  ✓ Bank accounts (${bankOk}/3)`);

  // ─── Financial years (2) ──────────────────────────────────
  let fyOk = 0;
  for (const fy of [
    { name: 'FY 2024-25', start: new Date('2024-04-01'), end: new Date('2025-03-31'), status: 'CLOSED' as const },
    { name: 'FY 2025-26', start: new Date('2025-04-01'), end: new Date('2026-03-31'), status: 'OPEN'   as const },
  ]) {
    const id = did(`sv-fy-${tenantId}-${fy.name}`);
    await safely(`fy ${fy.name}`, () => prisma.financialYear.upsert({
      where: { id },
      update: {},
      create: { id, tenantId, name: fy.name, startDate: fy.start, endDate: fy.end, status: fy.status },
    })).then(() => fyOk++);
  }
  console.log(`  ✓ Financial years (${fyOk}/2)`);

  // ─── Journal entries (20) ─────────────────────────────────
  let jeOk = 0;
  for (let i = 0; i < 20; i++) {
    const id = did(`sv-je-${tenantId}-${i}`);
    await safely(`je ${i}`, () => prisma.journalEntry.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        entryNumber: `SV-JE-${String(i + 1).padStart(5, '0')}`,
        date: daysAgo(randInt(1, 365)),
        description: pick([
          'Sales invoice posting', 'Supplier payment', 'GST output liability',
          'Salary posting', 'Bank charges', 'Depreciation', 'Stock purchase',
          'Loan interest', 'Insurance premium', 'Rent payment',
        ]),
        reference: `SV-REF-${i}`,
        status: i % 4 === 0 ? 'DRAFT' : 'POSTED',
        postedAt: i % 4 === 0 ? null : daysAgo(randInt(1, 30)),
      },
    })).then(() => jeOk++);
  }
  console.log(`  ✓ Journal entries (${jeOk}/20)`);

  // ─── Campaigns (30) ───────────────────────────────────────
  const campaignDefs = [
    { name: 'Akshaya Tritiya 2026 Mega Sale',       chan: 'WHATSAPP' as const, status: 'COMPLETED' as const, month: 3 },
    { name: 'Akshaya Tritiya Gold Coin Offer',      chan: 'SMS' as const,       status: 'COMPLETED' as const, month: 3 },
    { name: 'Akshaya Tritiya Email Blast',          chan: 'EMAIL' as const,     status: 'COMPLETED' as const, month: 3 },
    { name: 'Diwali 2025 - Dhanteras Specials',     chan: 'WHATSAPP' as const, status: 'COMPLETED' as const, month: 9 },
    { name: 'Diwali 2025 - Gold Schemes Push',      chan: 'SMS' as const,       status: 'COMPLETED' as const, month: 9 },
    { name: 'Karwachauth Gift Guide',                chan: 'EMAIL' as const,     status: 'COMPLETED' as const, month: 10 },
    { name: 'Wedding Season Bridal Showcase',       chan: 'WHATSAPP' as const, status: 'COMPLETED' as const, month: 10 },
    { name: 'Valentines Couple Ring Promotion',     chan: 'EMAIL' as const,     status: 'COMPLETED' as const, month: 1 },
    { name: 'Birthday Month Discount',               chan: 'SMS' as const,       status: 'ACTIVE' as const, month: 3 },
    { name: 'Referral Month April',                  chan: 'WHATSAPP' as const, status: 'ACTIVE' as const, month: 3 },
    { name: 'Gudi Padwa Maharashtrian Collection',  chan: 'EMAIL' as const,     status: 'COMPLETED' as const, month: 2 },
    { name: 'Baisakhi Punjabi Kada Offer',          chan: 'SMS' as const,       status: 'COMPLETED' as const, month: 3 },
    { name: 'Onam Kerala Traditional Collection',   chan: 'WHATSAPP' as const, status: 'COMPLETED' as const, month: 7 },
    { name: 'Rakhi Brother Sister Gift',            chan: 'EMAIL' as const,     status: 'COMPLETED' as const, month: 7 },
    { name: 'Janmashtami Krishna Collection',       chan: 'WHATSAPP' as const, status: 'COMPLETED' as const, month: 7 },
    { name: 'Navratri Nine Day Discount',           chan: 'SMS' as const,       status: 'COMPLETED' as const, month: 8 },
    { name: 'Dussehra Ravana Special',              chan: 'EMAIL' as const,     status: 'COMPLETED' as const, month: 8 },
    { name: 'Christmas Winter Gift',                 chan: 'WHATSAPP' as const, status: 'COMPLETED' as const, month: 11 },
    { name: 'New Year 2026 Celebration',            chan: 'SMS' as const,       status: 'COMPLETED' as const, month: 11 },
    { name: 'Pongal Tamil Nadu Special',            chan: 'WHATSAPP' as const, status: 'COMPLETED' as const, month: 0 },
    { name: 'Republic Day Patriotic Offer',         chan: 'EMAIL' as const,     status: 'COMPLETED' as const, month: 0 },
    { name: 'Mahashivratri Rudraksha Bundle',       chan: 'SMS' as const,       status: 'COMPLETED' as const, month: 1 },
    { name: 'Holi Colorful Stones Sale',            chan: 'WHATSAPP' as const, status: 'COMPLETED' as const, month: 2 },
    { name: 'Summer Collection Launch',              chan: 'EMAIL' as const,     status: 'SCHEDULED' as const, month: 4 },
    { name: 'Monsoon Lightweight Series',           chan: 'EMAIL' as const,     status: 'DRAFT' as const, month: 5 },
    { name: 'NRI Customer Special',                 chan: 'EMAIL' as const,     status: 'ACTIVE' as const, month: 3 },
    { name: 'Platinum Customer VIP Preview',        chan: 'WHATSAPP' as const, status: 'ACTIVE' as const, month: 3 },
    { name: 'Abandoned Cart Recovery Auto',         chan: 'EMAIL' as const,     status: 'ACTIVE' as const, month: 3 },
    { name: 'Golden Anniversary Reminder',          chan: 'WHATSAPP' as const, status: 'ACTIVE' as const, month: 3 },
    { name: 'Teachers Day Appreciation',            chan: 'SMS' as const,       status: 'DRAFT' as const, month: 8 },
  ];
  let campOk = 0;
  for (let i = 0; i < campaignDefs.length; i++) {
    const c = campaignDefs[i]!;
    const id = did(`sv-camp-${tenantId}-${i}`);
    await safely(`camp ${c.name}`, () => prisma.campaign.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        name: c.name,
        description: `${c.name} - broadcast to targeted customer segments`,
        status: c.status, channel: c.chan,
        totalRecipients: randInt(500, 8000),
        sentCount: c.status === 'DRAFT' || c.status === 'SCHEDULED' ? 0 : randInt(400, 7500),
        deliveredCount: c.status === 'DRAFT' || c.status === 'SCHEDULED' ? 0 : randInt(350, 7000),
        scheduledAt: new Date(2026 - (c.month > 3 ? 1 : 0), c.month, randInt(1, 28)),
      },
    })).then(() => campOk++);
  }
  console.log(`  ✓ Campaigns (${campOk}/30)`);

  // ─── Leads (100) ──────────────────────────────────────────
  const leadStatuses = ['NEW','NEW','NEW','CONTACTED','CONTACTED','QUALIFIED','QUALIFIED','PROPOSAL','WON','WON','LOST'] as const;
  let leadOk = 0;
  for (let i = 0; i < 100; i++) {
    const id = did(`sv-lead-${tenantId}-${i}`);
    const first = pick([...firstMale, ...firstFemale]);
    const last = pick(lastNames);
    await safely(`lead ${i}`, () => prisma.lead.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        firstName: first, lastName: last,
        phone: '+9197' + randInt(10000000, 99999999),
        email: `${first.toLowerCase()}.${last.toLowerCase()}.lead${i}@gmail.com`,
        source: pick(['WALK_IN','REFERRAL','WEBSITE','SOCIAL_MEDIA','CAMPAIGN']),
        status: leadStatuses[i % leadStatuses.length]!,
        assignedTo: pick(staffUserIds),
        estimatedValuePaise: BigInt(randInt(50000, 2000000) * 100),
        notes: pick([
          'Interested in bridal set for daughters wedding next Nov',
          'Looking for solitaire engagement ring budget 3L',
          'NRI customer - monthly gold SIP enquiry',
          'Wants mangalsutra with diamond drops',
          'Referral from Mrs. Mehta - VIP treatment',
          'Corporate gifting enquiry - 50 pieces',
        ]),
      },
    })).then(() => leadOk++);
  }
  console.log(`  ✓ Leads (${leadOk}/100)`);

  // ─── Loyalty transactions (200) ───────────────────────────
  let loyOk = 0;
  for (let i = 0; i < 200; i++) {
    const id = did(`sv-loy-${tenantId}-${i}`);
    const pts = randInt(100, 5000);
    await safely(`loy ${i}`, () => prisma.loyaltyTransaction.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        customerId: customerIds[i % customerIds.length]!,
        transactionType: i % 5 === 0 ? 'REDEEMED' : 'EARNED',
        points: pts,
        balanceAfter: pts * 3,
        description: i % 5 === 0 ? 'Redeemed against purchase' : 'Earned on purchase',
      },
    })).then(() => loyOk++);
  }
  console.log(`  ✓ Loyalty transactions (${loyOk}/200)`);

  // ─── Feedback ─────────────────────────────────────────────
  let fbOk = 0;
  for (let i = 0; i < 80; i++) {
    const id = did(`sv-fb-${tenantId}-${i}`);
    await safely(`fb ${i}`, () => prisma.feedback.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        customerId: customerIds[i * 3 % customerIds.length]!,
        feedbackType: pick(['PRODUCT','SERVICE','STAFF','OVERALL']) as any,
        rating: randInt(3, 5),
        comment: pick([
          'Excellent craftsmanship. Loved the intricate kundan work.',
          'Staff was very helpful and patient while selecting the right piece.',
          'Delivery was on time. Certificate was in order.',
          'Polish quality could be better, otherwise great.',
          'Best jewellery shopping experience I have had in years.',
          'The bridal set exceeded all expectations.',
          'Prompt after-sales service.',
        ]),
        status: i % 3 === 0 ? 'REVIEWED' : 'NEW' as any,
      },
    })).then(() => fbOk++);
  }
  console.log(`  ✓ Feedback (${fbOk}/80)`);

  // ─── Customer interactions ────────────────────────────────
  let ciOk = 0;
  for (let i = 0; i < 120; i++) {
    const id = did(`sv-ci-${tenantId}-${i}`);
    await safely(`ci ${i}`, () => prisma.customerInteraction.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        customerId: customerIds[i * 2 % customerIds.length]!,
        interactionType: pick(['CALL','EMAIL','WHATSAPP','IN_PERSON','SMS']) as any,
        direction: pick(['INBOUND','OUTBOUND']) as any,
        subject: pick([
          'Enquiry about bridal set',
          'Payment confirmation follow-up',
          'Anniversary gift suggestion',
          'Repair status update',
          'New collection preview invite',
          'Scheme installment reminder',
        ]),
        content: 'Reached out to customer regarding follow-up.',
        userId: pick(staffUserIds),
      },
    })).then(() => ciOk++);
  }
  console.log(`  ✓ Customer interactions (${ciOk}/120)`);

  // ─── HUID records (100) ───────────────────────────────────
  let huidOk = 0;
  for (let i = 0; i < 100; i++) {
    const p = products[i]!;
    const id = did(`sv-huid-${tenantId}-${p.id}`);
    await safely(`huid ${i}`, async () => {
      const prod = await prisma.product.findUnique({ where: { id: p.id } });
      if (!prod || !prod.huidNumber) return;
      return prisma.huidRecord.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId, productId: p.id,
          huidNumber: prod.huidNumber,
          articleType: p.cat,
          metalType: 'GOLD' as any,
          purityFineness: prod.metalPurity ?? 916,
          weightMg: prod.grossWeightMg ?? BigInt(10000),
          registeredAt: daysAgo(randInt(10, 365)),
          status: 'ACTIVE' as any,
          verifiedAt: daysAgo(randInt(10, 365)),
        },
      });
    }).then(() => huidOk++);
  }
  console.log(`  ✓ HUID records (${huidOk}/100)`);

  // ─── Hallmark centers + submissions (15) ─────────────────
  const hmCenters = [
    { id: did('sv-hmc-mumbai'),   code: 'BIS-MUM-001', name: 'BIS Hallmarking Centre Mumbai Fort', city: 'Mumbai',    state: 'Maharashtra', lic: 'CM/L-1234567' },
    { id: did('sv-hmc-delhi'),    code: 'BIS-DEL-001', name: 'BIS Hallmarking Centre Karol Bagh',  city: 'New Delhi', state: 'Delhi',       lic: 'CM/L-2234567' },
    { id: did('sv-hmc-bengaluru'),code: 'BIS-BLR-001', name: 'BIS Hallmarking Centre Jayanagar',   city: 'Bengaluru', state: 'Karnataka',   lic: 'CM/L-3234567' },
    { id: did('sv-hmc-jaipur'),   code: 'BIS-JAI-001', name: 'BIS Hallmarking Centre Johari Bazaar',city: 'Jaipur',   state: 'Rajasthan',   lic: 'CM/L-4234567' },
  ];
  for (const c of hmCenters) {
    await safely(`hmc ${c.code}`, () => prisma.hallmarkCenter.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        centerCode: c.code, name: c.name,
        city: c.city, state: c.state,
        bisLicenseNumber: c.lic,
      },
    }));
  }
  let hmsOk = 0;
  for (let i = 0; i < 15; i++) {
    const id = did(`sv-hms-${tenantId}-${i}`);
    const center = hmCenters[i % hmCenters.length]!;
    const locKey = showroomKeys[i % showroomKeys.length]!;
    await safely(`hms ${i}`, () => prisma.hallmarkSubmission.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        submissionNumber: `SV-HMS-${String(i + 1).padStart(5, '0')}`,
        hallmarkCenterId: center.id,
        locationId: locationIds[locKey]!,
        status: pick(['COMPLETED','COMPLETED','IN_PROGRESS','SUBMITTED']) as any,
        submittedDate: daysAgo(randInt(5, 180)),
        expectedReturnDate: daysAgo(randInt(1, 30)),
        actualReturnDate: i % 3 === 0 ? daysAgo(randInt(0, 20)) : null,
        totalItems: randInt(10, 100),
        passedItems: randInt(8, 95),
        failedItems: randInt(0, 3),
      },
    })).then(() => hmsOk++);

    // Add items for each submission
    for (let k = 0; k < 5; k++) {
      const itemId = did(`sv-hms-item-${id}-${k}`);
      const p = products[(i * 5 + k) % products.length]!;
      await safely(`hms-item ${i}-${k}`, () => prisma.hallmarkSubmissionItem.upsert({
        where: { id: itemId },
        update: {},
        create: {
          id: itemId, tenantId,
          submissionId: id, productId: p.id,
          status: 'PASSED' as any,
          declaredPurity: 916, testedPurity: 916,
          huidAssigned: crypto.createHash('sha1').update(itemId).digest('hex').slice(0, 6).toUpperCase(),
        },
      }));
    }
  }
  console.log(`  ✓ Hallmark submissions (${hmsOk}/15)`);

  // ─── Gemstone certificates (50) ───────────────────────────
  let gcOk = 0;
  for (let i = 0; i < 50; i++) {
    const p = products[i * 7 % products.length]!;
    const id = did(`sv-gc-${tenantId}-${i}`);
    await safely(`gc ${i}`, () => prisma.gemstoneCertificate.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        productId: p.id,
        certificateNumber: `${pick(['GIA','IGI','HRD'])}-${crypto.createHash('sha1').update(`gc-${i}`).digest('hex').slice(0, 10).toUpperCase()}`,
        issuingLab: pick(['GIA','IGI','HRD']) as any,
        stoneType: 'Diamond',
        caratWeight: randInt(20, 300), // in 1/100 ct
        color: pick(['D','E','F','G','H','I']),
        clarity: pick(['VVS1','VVS2','VS1','VS2','SI1']),
        cut: pick(['Excellent','Very Good','Good']),
        shape: pick(['Round','Oval','Princess','Cushion']),
        dimensions: `${(randInt(500, 800)/100).toFixed(2)}mm x ${(randInt(500, 800)/100).toFixed(2)}mm`,
        fluorescence: pick(['None','Faint','Medium']),
        certificateDate: daysAgo(randInt(10, 500)),
        isVerified: true,
        verifiedAt: daysAgo(randInt(1, 90)),
      },
    })).then(() => gcOk++);
  }
  console.log(`  ✓ Gemstone certs (${gcOk}/50)`);

  // ─── Insurance policies (per branch + vault) ──────────────
  let insOk = 0;
  for (let i = 0; i < showroomDefs.length; i++) {
    const l = showroomDefs[i]!;
    const id = did(`sv-ins-${tenantId}-${l.key}`);
    const coverage = l.type === 'WAREHOUSE' ? 500_00_00000 : l.type === 'WORKSHOP' ? 80_00_00000 : 200_00_00000;
    await safely(`ins ${l.key}`, () => prisma.insurancePolicy.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        policyNumber: `TATA-AIG-${String(i + 1).padStart(6, '0')}`,
        provider: pick(['TATA AIG', 'Bajaj Allianz', 'HDFC Ergo', 'ICICI Lombard']),
        locationId: locationIds[l.key]!,
        coverageType: (l.type === 'WAREHOUSE' ? 'VAULT' : l.type === 'WORKSHOP' ? 'INVENTORY' : 'INVENTORY') as any,
        coveredValuePaise: BigInt(coverage),
        premiumPaise: BigInt(Math.floor(coverage * 0.006)),
        startDate: new Date('2025-04-01'),
        endDate: new Date('2026-03-31'),
        status: 'ACTIVE' as any,
      },
    })).then(() => insOk++);
  }
  console.log(`  ✓ Insurance policies (${insOk}/${showroomDefs.length})`);

  // ─── Girvi loans (40 active + 20 closed) ─────────────────
  let girviOk = 0;
  for (let i = 0; i < 60; i++) {
    const id = did(`sv-girvi-${tenantId}-${i}`);
    const principal = BigInt(randInt(50000, 5000000) * 100);
    const isClosed = i >= 40;
    const status = isClosed ? 'CLOSED' : (i % 8 === 0 ? 'PARTIALLY_PAID' : 'ACTIVE');
    const outstanding = isClosed ? BigInt(0) : (status === 'PARTIALLY_PAID' ? principal / BigInt(2) : principal);
    await safely(`girvi ${i}`, () => prisma.girviLoan.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        loanNumber: `SV-GRV-${String(i + 1).padStart(5, '0')}`,
        customerId: customerIds[i * 11 % customerIds.length]!,
        locationId: primaryLocId,
        status: status as any,
        collateralDescription: pick([
          'Gold necklace 45g + bangle pair',
          'Diamond ring + gold chain 30g',
          'Heavy kundan choker 80g',
          'Gold bangles pair 60g',
          'Mangalsutra + gold coins 25g',
        ]),
        metalType: 'GOLD' as any,
        grossWeightMg: BigInt(randInt(25, 150) * 1000),
        netWeightMg: BigInt(randInt(23, 145) * 1000),
        purityFineness: 916,
        appraisedValuePaise: principal * BigInt(135) / BigInt(100),
        loanAmountPaise: principal,
        interestRate: randInt(1200, 2400), // 12-24% annual
        interestType: 'SIMPLE' as any,
        disbursedDate: daysAgo(randInt(30, 720)),
        dueDate: daysAhead(isClosed ? -randInt(10, 100) : randInt(-90, 300)),
        outstandingPrincipalPaise: outstanding,
        outstandingInterestPaise: isClosed ? BigInt(0) : principal * BigInt(3) / BigInt(100),
        totalPrincipalPaidPaise: principal - outstanding,
        aadhaarVerified: true, panVerified: true,
      },
    })).then(() => girviOk++);
  }
  console.log(`  ✓ Girvi loans (${girviOk}/60)`);

  // ─── Gold Savings Schemes (8 schemes x 100+ members) ─────
  const gsSchemeNames = [
    'Shree Vama Swarna Jyoti 11+1 Plan',
    'Dhanlaxmi Gold Saver Monthly',
    'Vama Shagun Pre-Wedding Plan',
    'Akshay Nidhi Yearly Plus',
    'Ganapati Gold Saver',
    'Kuber Dhan Monthly Scheme',
    'Lakshmi Kripa Half-Yearly',
    'Vama Premium 24-Month Plus',
  ];
  const gsIds: string[] = [];
  let gsOk = 0;
  for (let i = 0; i < gsSchemeNames.length; i++) {
    const id = did(`sv-gs-${tenantId}-${i}`);
    gsIds.push(id);
    const monthly = pick([2000, 5000, 10000, 25000, 50000]);
    await safely(`gs ${i}`, () => prisma.goldSavingsScheme.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        schemeName: gsSchemeNames[i]!,
        monthlyAmountPaise: BigInt(monthly * 100),
        durationMonths: i < 6 ? 11 : 24,
        bonusMonths: i < 6 ? 1 : 2,
        maturityBonusPercent: i < 6 ? 800 : 1200,
        startDate: daysAgo(randInt(30, 365)),
        status: 'ACTIVE' as any,
        terms: `Pay for ${i < 6 ? 11 : 24} months, get ${i < 6 ? 'one bonus' : 'two bonus'} month plus maturity gift voucher`,
      },
    })).then(() => gsOk++);
  }
  let gsMemOk = 0;
  for (let s = 0; s < gsIds.length; s++) {
    const count = randInt(100, 180);
    for (let m = 0; m < count; m++) {
      const id = did(`sv-gsm-${tenantId}-${s}-${m}`);
      await safely(`gsm ${s}-${m}`, () => prisma.goldSavingsMember.upsert({
        where: { id },
        update: {},
        create: {
          id, tenantId,
          goldSavingsSchemeId: gsIds[s]!,
          customerId: customerIds[(s * 37 + m) % customerIds.length]!,
          memberNumber: `SV-GS${s + 1}-${String(m + 1).padStart(4, '0')}`,
          joinedDate: daysAgo(randInt(30, 300)),
          status: 'ACTIVE' as any,
          totalPaidPaise: BigInt(randInt(5, 80) * 5000 * 100),
        },
      })).then(() => gsMemOk++);
    }
  }
  console.log(`  ✓ Gold schemes (${gsOk}/8, members ${gsMemOk})`);

  // ─── Kitty Schemes (5) ────────────────────────────────────
  const kittyIds: string[] = [];
  let kitOk = 0;
  for (let i = 0; i < 5; i++) {
    const id = did(`sv-kitty-${tenantId}-${i}`);
    kittyIds.push(id);
    await safely(`kitty ${i}`, () => prisma.kittyScheme.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        schemeName: `Vama Kitty ${pick(['Gold','Silver','Diamond','Premium','Royal'])} Circle ${i + 1}`,
        schemeType: 'KITTY' as any,
        monthlyAmountPaise: BigInt(pick([5000, 10000, 25000]) * 100),
        durationMonths: 12,
        totalValuePaise: BigInt(pick([60000, 120000, 300000]) * 100),
        bonusPercent: 600,
        startDate: daysAgo(randInt(30, 300)),
        endDate: daysAhead(randInt(30, 300)),
        status: 'ACTIVE' as any,
        maxMembers: 30,
        currentMembers: randInt(20, 30),
      },
    })).then(() => kitOk++);

    // 20-40 members each
    const memCount = randInt(20, 35);
    for (let m = 0; m < memCount; m++) {
      const mid = did(`sv-km-${id}-${m}`);
      await safely(`km ${i}-${m}`, () => prisma.kittyMember.upsert({
        where: { id: mid },
        update: {},
        create: {
          id: mid, tenantId,
          kittySchemeId: id,
          customerId: customerIds[(i * 50 + m) % customerIds.length]!,
          memberNumber: `SVK${i + 1}-M${String(m + 1).padStart(3, '0')}`,
          joinedDate: daysAgo(randInt(30, 300)),
          paidInstallments: randInt(1, 11),
          totalPaidPaise: BigInt(randInt(5000, 100000) * 100),
        },
      }));
    }
  }
  console.log(`  ✓ Kitty schemes (${kitOk}/5)`);

  // ─── Metal Rate History (30 days) ─────────────────────────
  let rateOk = 0;
  for (let i = 0; i < 30; i++) {
    const when = daysAgo(i);
    for (const metal of ['GOLD','SILVER','PLATINUM'] as const) {
      for (const purity of metal === 'GOLD' ? [999, 916, 750] : metal === 'SILVER' ? [999] : [950]) {
        const id = did(`sv-rate-${metal}-${purity}-${i}`);
        const basePerG = metal === 'GOLD'     ? (purity === 999 ? 7350 : purity === 916 ? 6750 : 5520)
                       : metal === 'SILVER'   ? 92
                       : 3250;
        const perG = basePerG + randInt(-60, 60);
        await safely(`rate ${metal}-${i}`, () => prisma.metalRateHistory.upsert({
          where: { id },
          update: {},
          create: {
            id,
            metalType: metal as any,
            purity,
            ratePerGramPaise: BigInt(perG * 100),
            ratePer10gPaise: BigInt(perG * 1000),
            ratePerTolaPaise: BigInt(Math.floor(perG * 11.664 * 100)),
            ratePerTroyOzPaise: BigInt(Math.floor(perG * 31.1035 * 100)),
            source: 'MCX',
            recordedAt: when,
          },
        })).then(() => rateOk++);
      }
    }
  }
  console.log(`  ✓ Metal rates (${rateOk})`);

  // ─── CMS Banners (10) ─────────────────────────────────────
  const bannerDefs = [
    { title: 'Akshaya Tritiya 2026', subtitle: 'Auspicious buying - Special making charges', seed: 'aksha' },
    { title: 'Diwali Dhamaka',        subtitle: 'Up to 30% off on making charges',             seed: 'diwali' },
    { title: 'Wedding Season Bridal Showcase', subtitle: 'New Rajputana Suite - Limited Pieces', seed: 'bridal' },
    { title: 'Vama Radha Collection Launch',   subtitle: 'Kundan + Polki masterpieces',        seed: 'radha' },
    { title: 'Solitaire Summer Sale',          subtitle: 'GIA-certified diamonds',             seed: 'solitaire' },
    { title: 'Mahalakshmi Temple Collection',  subtitle: 'Inspired by South Indian temples',   seed: 'temple' },
    { title: 'Banarasi Meenakari Festive',     subtitle: 'Handpainted enamel jewellery',       seed: 'meena' },
    { title: 'Daily Elegance',                 subtitle: 'Lightweight pieces under 10g',       seed: 'daily' },
    { title: 'Gold Scheme - Swarna Jyoti',     subtitle: '11 months + 1 bonus',                seed: 'scheme' },
    { title: 'NRI Gifting',                    subtitle: 'Secure global delivery',             seed: 'nri' },
  ];
  let bannerOk = 0;
  for (let i = 0; i < bannerDefs.length; i++) {
    const b = bannerDefs[i]!;
    const id = did(`sv-banner-${tenantId}-${i}`);
    await safely(`banner ${i}`, () => prisma.banner.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        title: b.title, subtitle: b.subtitle,
        imageUrl: `https://loremflickr.com/1600/600/${b.seed},jewelry,gold?lock=${i + 200}`,
        linkType: 'COLLECTION' as any,
        position: i === 0 ? 'HERO' as any : i < 3 ? 'HERO' as any : 'SECONDARY' as any,
        displayOrder: i, isActive: true,
      },
    })).then(() => bannerOk++);
  }
  console.log(`  ✓ Banners (${bannerOk}/10)`);

  // ─── Blog posts (25) ──────────────────────────────────────
  const blogDefs = [
    'Caring for your gold jewellery: a complete guide',
    'How to choose the right diamond: the 4Cs explained',
    'Top 5 tips for buying a bridal set in 2026',
    'Understanding BIS hallmarking and HUID',
    '22K vs 18K vs 14K: which gold purity is right for you',
    'Trending necklace styles this wedding season',
    'Why HUID matters when you resell jewellery',
    'Festival gifting ideas: Diwali edition',
    'Kundan vs Polki vs Jadau: a beginners guide',
    'Meenakari: the painted heritage of Indian jewellery',
    'Gold SIP vs physical gold: what makes sense today',
    'Akshaya Tritiya: the auspicious day explained',
    'Storage and safekeeping: at home vs bank locker',
    'Insurance for your jewellery: do you need it?',
    'Authentic Jadau craftsmanship: Bhuj traditions',
    'Temple jewellery: history and modern revival',
    'Diamond clarity grades demystified',
    'Rose gold vs yellow gold: 2026 trends',
    'Lightweight jewellery for everyday office wear',
    'Gifting for Karwachauth: thoughtful options',
    'How to verify your jewellery certificate online',
    'Anti-tarnish care for silver 925 pieces',
    'Passing on jewellery to the next generation',
    'Investment grade gold: coins vs bars vs jewellery',
    'Bridal jewellery for different Indian cultures',
  ];
  let blogOk = 0;
  for (let i = 0; i < blogDefs.length; i++) {
    const title = blogDefs[i]!;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
    const id = did(`sv-blog-${tenantId}-${slug}`);
    await safely(`blog ${i}`, () => prisma.blogPost.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        title, slug,
        excerpt: title + ' — everything you need to know in one place.',
        content: `<h2>${title}</h2><p>Jewellery is more than an accessory — it is an heirloom. This guide walks you through everything you need to know.</p><p>${'Detail paragraph. '.repeat(20)}</p>`,
        coverImageUrl: `https://loremflickr.com/1200/600/jewelry,${slug.split('-')[0]}?lock=${i + 300}`,
        author: pick(['Priya Sharma','Rajesh Mehta','Divya Menon','Anjali Chopra']),
        categoryTag: pick(['Care Tips','Buying Guides','Trends','Compliance','Culture']),
        tags: ['gold', 'jewelry', slug.split('-')[0]!, 'india'],
        readTimeMinutes: randInt(4, 12),
        isPublished: true,
        publishedAt: daysAgo(randInt(1, 365)),
        viewCount: randInt(200, 15000),
      },
    })).then(() => blogOk++);
  }
  console.log(`  ✓ Blog posts (${blogOk}/25)`);

  // ─── Collections (10) ─────────────────────────────────────
  let colOk = 0;
  const storefrontCollections = ['Bridal','Daily Wear','Festive','Diamond','Kundan','Pearl','Silver','Children','Men','Rose Gold'];
  for (let i = 0; i < storefrontCollections.length; i++) {
    const slug = storefrontCollections[i]!.toLowerCase().replace(/ /g, '-');
    const id = did(`sv-coll-${tenantId}-${slug}`);
    // pick relevant product ids
    const pids = products
      .filter(p => storefrontCollections[i]!.toLowerCase().includes('bridal') ? p.collection.includes('radha') || p.collection.includes('kundan') || p.collection.includes('polki') : true)
      .slice(i * 15, i * 15 + 30)
      .map(p => p.id);
    await safely(`coll ${slug}`, () => prisma.collection.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        name: storefrontCollections[i]!, slug,
        description: `${storefrontCollections[i]} collection from Shree Vama - handpicked pieces for every occasion.`,
        imageUrl: `https://loremflickr.com/800/500/${slug},jewelry?lock=${i + 400}`,
        isFeatured: i < 5, isActive: true, displayOrder: i,
        products: pids,
      },
    })).then(() => colOk++);
  }
  console.log(`  ✓ Collections (${colOk}/10)`);

  // ─── Product reviews (300) ────────────────────────────────
  let revOk = 0;
  for (let i = 0; i < 300; i++) {
    const id = did(`sv-rev-${tenantId}-${i}`);
    const rating = rand() < 0.85 ? randInt(4, 5) : randInt(2, 4);
    await safely(`rev ${i}`, () => prisma.productReview.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        productId: products[i % products.length]!.id,
        customerName: pick([...firstMale, ...firstFemale]) + ' ' + pick(lastNames),
        rating,
        title: pick([
          'Beautiful craftsmanship','Exceeded expectations','Loved it','Great quality',
          'Prompt delivery and great finish','Heirloom piece','Gift well received',
          'Exactly as described','Perfect for my daughter','Will buy again',
        ]),
        body: pick([
          'The piece looks stunning in person. Finish is flawless and the polish is beyond expectation. Very happy with the purchase.',
          'Bought this for my wife for our anniversary. She absolutely loved the design and the kundan work is exquisite.',
          'Shree Vama craftsmanship lives up to the reputation. Polki setting is tight and secure.',
          'The certificate came pre-verified. Great touch. Jewellery arrived in premium packaging.',
          'A little heavier than expected on the ears but the Chandbali design is gorgeous.',
        ]),
        isVerified: true, isPublished: true,
        publishedAt: daysAgo(randInt(1, 365)),
      },
    })).then(() => revOk++);
  }
  console.log(`  ✓ Reviews (${revOk}/300)`);

  // ─── Wishlist / Abandoned carts / Recently viewed / Pre-orders ──
  let wishOk = 0, cartOk = 0, rvOk = 0, preOk = 0;
  for (let i = 0; i < 200; i++) {
    const id = did(`sv-wish-${tenantId}-${i}`);
    const cust = customerIds[i % customerIds.length]!;
    const p = products[(i * 7) % products.length]!;
    await safely(`wish ${i}`, () => prisma.wishlist.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, customerId: cust, productId: p.id,
        priceAtAddPaise: p.price,
      },
    })).then(() => wishOk++);
  }
  for (let i = 0; i < 50; i++) {
    const id = did(`sv-ac-${tenantId}-${i}`);
    const cust = customerIds[i * 5 % customerIds.length]!;
    const p = products[i * 3 % products.length]!;
    await safely(`ac ${i}`, () => prisma.abandonedCart.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        cartSessionId: `sv-sess-${crypto.createHash('sha1').update(String(i)).digest('hex').slice(0, 16)}`,
        customerId: cust,
        customerEmail: `cart${i}@customer.com`,
        items: [{ productId: p.id, quantity: 1 }],
        totalPaise: p.price,
        itemCount: 1,
        abandonedAt: daysAgo(randInt(1, 30)),
        status: pick(['DETECTED','EMAIL_SENT','RECOVERED']) as any,
      },
    })).then(() => cartOk++);
  }
  for (let i = 0; i < 100; i++) {
    const id = did(`sv-rv-${tenantId}-${i}`);
    const cust = customerIds[i % customerIds.length]!;
    const p = products[(i * 11) % products.length]!;
    await safely(`rv ${i}`, () => prisma.recentlyViewed.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, customerId: cust, productId: p.id,
        viewedAt: daysAgo(randInt(0, 20)),
      },
    })).then(() => rvOk++);
  }
  for (let i = 0; i < 30; i++) {
    const id = did(`sv-preo-${tenantId}-${i}`);
    const cust = customerIds[i % customerIds.length]!;
    const p = products[i * 3 % products.length]!;
    await safely(`preo ${i}`, () => prisma.preOrder.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, customerId: cust, productId: p.id,
        quantity: 1,
        status: pick(['PENDING','CONFIRMED','FULFILLED']) as any,
        orderType: pick(['PRE_ORDER','BACKORDER','CUSTOM_ORDER']) as any,
        depositPaise: p.price * BigInt(20) / BigInt(100),
        estimatedAvailableDate: daysAhead(randInt(10, 90)),
        estimatedDeliveryDate: daysAhead(randInt(15, 120)),
        notes: 'Customer requested specific purity and stone setting',
        priceLockPaise: p.price,
        isPriceLocked: true,
      },
    })).then(() => preOk++);
  }
  console.log(`  ✓ Storefront: wish=${wishOk} cart=${cartOk} rv=${rvOk} pre=${preOk}`);

  // ─── Video consultations (20) ─────────────────────────────
  const vcStatuses = ['REQUESTED','REQUESTED','REQUESTED','REQUESTED','SCHEDULED','SCHEDULED','SCHEDULED','SCHEDULED','SCHEDULED','COMPLETED','COMPLETED','COMPLETED','COMPLETED','COMPLETED','COMPLETED','COMPLETED','COMPLETED','CANCELLED','NO_SHOW','COMPLETED'];
  let vcOk = 0;
  for (let i = 0; i < 20; i++) {
    const id = did(`sv-vc-${tenantId}-${i}`);
    const status = vcStatuses[i]!;
    await safely(`vc ${i}`, () => prisma.videoConsultation.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        customerId: customerIds[i * 13 % customerIds.length]!,
        requestedAt: daysAgo(randInt(1, 30)),
        scheduledAt: status === 'REQUESTED' ? null : daysAhead(randInt(-20, 15)),
        startedAt: status === 'COMPLETED' ? daysAgo(randInt(1, 20)) : null,
        endedAt: status === 'COMPLETED' ? daysAgo(randInt(0, 19)) : null,
        status,
        meetingUrl: 'https://meet.shreevama.com/room-' + i,
        customerPhone: '+9198' + randInt(10000000, 99999999),
        preferredLang: pick(['en','hi','mr','ta','gu']),
        productsOfInterest: [{ productId: products[i]!.id, notes: 'Customer wants similar design' }],
      },
    })).then(() => vcOk++);
  }
  console.log(`  ✓ Video consultations (${vcOk}/20)`);

  // ─── Payroll (30 employees, 2 periods, 60 payslips) ──────
  const empIds: string[] = [];
  let empOk = 0;
  for (let i = 0; i < 30; i++) {
    const id = did(`sv-emp-${tenantId}-${i}`);
    empIds.push(id);
    const basic = BigInt(randInt(25000, 80000) * 100);
    await safely(`emp ${i}`, () => prisma.employee.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        employeeCode: `SV-EMP-${String(i + 1).padStart(4, '0')}`,
        firstName: pick([...firstMale, ...firstFemale]),
        lastName: pick(lastNames),
        joinedAt: daysAgo(randInt(200, 3000)),
        designation: pick(['Sales Executive','Senior Sales','Branch Manager','Cashier','Security Officer','Accountant','HR Executive','Quality Inspector']),
        department: pick(['Retail','Manufacturing','Finance','HR','Security']),
        basicSalaryPaise: basic,
        hraPaise: basic * BigInt(40) / BigInt(100),
        daPaise: basic * BigInt(12) / BigInt(100),
        conveyancePaise: BigInt(1600 * 100),
        status: 'ACTIVE' as any,
      },
    })).then(() => empOk++);
  }
  for (const period of [
    { label: '2026-02', id: did(`sv-period-${tenantId}-2026-02`), start: new Date('2026-02-01'), end: new Date('2026-02-28'), processed: new Date('2026-03-03') },
    { label: '2026-03', id: did(`sv-period-${tenantId}-2026-03`), start: new Date('2026-03-01'), end: new Date('2026-03-31'), processed: new Date('2026-04-03') },
  ]) {
    await safely(`period ${period.label}`, () => prisma.payrollPeriod.upsert({
      where: { id: period.id },
      update: {},
      create: {
        id: period.id, tenantId, periodLabel: period.label,
        startDate: period.start, endDate: period.end,
        status: 'PROCESSED' as any, processedAt: period.processed,
      },
    }));
    for (const empId of empIds) {
      const psId = did(`sv-payslip-${period.id}-${empId}`);
      const basic = BigInt(40000 * 100);
      const gross = basic * BigInt(155) / BigInt(100);
      const ded = gross * BigInt(13) / BigInt(100);
      await safely(`payslip ${empId.slice(0, 8)}`, () => prisma.payslip.upsert({
        where: { id: psId },
        update: {},
        create: {
          id: psId, tenantId,
          employeeId: empId,
          payrollPeriodId: period.id,
          basicSalary: basic,
          hra: basic * BigInt(40) / BigInt(100),
          grossSalary: gross,
          pfDeduction: basic * BigInt(12) / BigInt(100),
          totalDeductions: ded,
          netSalary: gross - ded,
          workDays: 26,
          presentDays: randInt(23, 26),
          status: 'APPROVED' as any,
        },
      }));
    }
  }
  console.log(`  ✓ Payroll (${empOk}/30 employees, 2 periods, 60 payslips)`);

  // ─── Audit logs (500+) ────────────────────────────────────
  let auditOk = 0;
  for (let i = 0; i < 520; i++) {
    const id = did(`sv-audit-${tenantId}-${i}`);
    await safely(`audit ${i}`, () => prisma.auditLog.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId,
        userId: pick(staffUserIds),
        action: pick(['CREATE','UPDATE','DELETE','LOGIN','VIEW','EXPORT']),
        entityType: pick(['Sale','Product','Customer','Invoice','JobOrder','Payment','StockItem','PurchaseOrder']),
        entityId: did(`sv-ent-${i}`),
        ipAddress: `10.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
        userAgent: pick([
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'CaratFlow Mobile/1.2 (iOS)',
          'CaratFlow Mobile/1.2 (Android)',
        ]),
      },
    })).then(() => auditOk++);
  }
  console.log(`  ✓ Audit logs (${auditOk}/520)`);

  console.log('✔ Shree Vama realistic seed complete!');
  console.log('');
  console.log('Login: admin@sharmajewellers.com / admin123  (existing admin)');
  console.log('Tenant display: Shree Vama Jewellers Pvt Ltd (slug: sharma-jewellers)');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error('✘ Realistic seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
