// ─── CaratFlow Validators ──────────────────────────────────────
// Format validators for Indian and international business identifiers.

// ─── GSTIN (Goods and Services Tax Identification Number) ──────
// Format: 2-digit state code + 10-char PAN + entity code + Z + checksum
// Example: 27AABCS1429B1Z5

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(gstin: string): boolean {
  if (!gstin || gstin.length !== 15) return false;
  if (!GSTIN_REGEX.test(gstin)) return false;

  // Validate state code (01-37 plus special codes)
  const stateCode = parseInt(gstin.substring(0, 2), 10);
  if (stateCode < 1 || stateCode > 37) return false;

  // Validate embedded PAN
  const pan = gstin.substring(2, 12);
  if (!isValidPan(pan)) return false;

  return true;
}

/** Extract state code from GSTIN */
export function gstinStateCode(gstin: string): string {
  return gstin.substring(0, 2);
}

// ─── PAN (Permanent Account Number) ───────────────────────────
// Format: AAAPL1234C (5 letters + 4 digits + 1 letter)
// 4th character indicates entity type: P=Person, C=Company, H=HUF, etc.

const PAN_REGEX = /^[A-Z]{3}[ABCFGHLJPTK][A-Z][0-9]{4}[A-Z]$/;

export function isValidPan(pan: string): boolean {
  if (!pan || pan.length !== 10) return false;
  return PAN_REGEX.test(pan);
}

/** Get entity type from PAN 4th character */
export function panEntityType(pan: string): string {
  const typeMap: Record<string, string> = {
    A: 'Association of Persons',
    B: 'Body of Individuals',
    C: 'Company',
    F: 'Firm',
    G: 'Government',
    H: 'Hindu Undivided Family',
    L: 'Local Authority',
    J: 'Artificial Juridical Person',
    P: 'Person (Individual)',
    T: 'Trust',
    K: 'Krishi (Agriculture)',
  };
  return typeMap[pan.charAt(3)] ?? 'Unknown';
}

// ─── Aadhaar (12-digit unique ID with Verhoeff checksum) ──────

const VERHOEFF_TABLE_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_TABLE_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const VERHOEFF_TABLE_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function verhoeffChecksum(num: string): boolean {
  let c = 0;
  const digits = num.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    const p = VERHOEFF_TABLE_P[i % 8]![digits[i]!]!;
    c = VERHOEFF_TABLE_D[c]![p]!;
  }
  return c === 0;
}

export function isValidAadhaar(aadhaar: string): boolean {
  if (!aadhaar) return false;
  const cleaned = aadhaar.replace(/\s/g, '');
  if (cleaned.length !== 12) return false;
  if (!/^\d{12}$/.test(cleaned)) return false;
  // First digit cannot be 0 or 1
  if (cleaned.charAt(0) === '0' || cleaned.charAt(0) === '1') return false;
  return verhoeffChecksum(cleaned);
}

// ─── Email ─────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

// ─── Phone ─────────────────────────────────────────────────────
// Validates phone with optional country code.

const PHONE_PATTERNS: Record<string, RegExp> = {
  IN: /^(\+91)?[6-9]\d{9}$/,
  US: /^(\+1)?[2-9]\d{9}$/,
  AE: /^(\+971)?[2-9]\d{7,8}$/,
  GB: /^(\+44)?[1-9]\d{9,10}$/,
  SG: /^(\+65)?[3689]\d{7}$/,
  DEFAULT: /^\+?[1-9]\d{6,14}$/,
};

export function isValidPhone(phone: string, countryCode?: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s()-]/g, '');
  const pattern = (countryCode ? PHONE_PATTERNS[countryCode] : undefined) ?? PHONE_PATTERNS['DEFAULT']!;
  return pattern.test(cleaned);
}

// ─── HUID (Hallmark Unique Identification) ─────────────────────
// 6-character alphanumeric code assigned by BIS India.

const HUID_REGEX = /^[A-Z0-9]{6}$/;

export function isValidHuid(huid: string): boolean {
  if (!huid || huid.length !== 6) return false;
  return HUID_REGEX.test(huid.toUpperCase());
}

// ─── Indian PIN Code ───────────────────────────────────────────

export function isValidPinCode(pin: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pin);
}

// ─── US ZIP Code ───────────────────────────────────────────────

export function isValidZipCode(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip);
}
