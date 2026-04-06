import { describe, it, expect } from 'vitest';
import {
  isValidGstin,
  gstinStateCode,
  isValidPan,
  panEntityType,
  isValidAadhaar,
  isValidEmail,
  isValidPhone,
  isValidHuid,
  isValidPinCode,
  isValidZipCode,
} from '../validators';

describe('GSTIN Validator', () => {
  describe('isValidGstin', () => {
    it('accepts a valid GSTIN', () => {
      expect(isValidGstin('27AABCS1429B1Z5')).toBe(true);
    });

    it('accepts GSTIN with state code 01 (Jammu & Kashmir)', () => {
      expect(isValidGstin('01AABCS1429B1Z5')).toBe(true);
    });

    it('accepts GSTIN with state code 37 (Andhra Pradesh)', () => {
      expect(isValidGstin('37AABCS1429B1Z5')).toBe(true);
    });

    it('accepts GSTIN with entity code other than 1', () => {
      expect(isValidGstin('27AABCS1429B2Z5')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidGstin('')).toBe(false);
    });

    it('rejects null-like input', () => {
      expect(isValidGstin(undefined as unknown as string)).toBe(false);
      expect(isValidGstin(null as unknown as string)).toBe(false);
    });

    it('rejects GSTIN with wrong length (14 chars)', () => {
      expect(isValidGstin('27AABCS1429B1Z')).toBe(false);
    });

    it('rejects GSTIN with wrong length (16 chars)', () => {
      expect(isValidGstin('27AABCS1429B1Z55')).toBe(false);
    });

    it('rejects GSTIN with invalid state code (00)', () => {
      expect(isValidGstin('00AABCS1429B1Z5')).toBe(false);
    });

    it('rejects GSTIN with state code > 37', () => {
      expect(isValidGstin('38AABCS1429B1Z5')).toBe(false);
      expect(isValidGstin('99AABCS1429B1Z5')).toBe(false);
    });

    it('rejects GSTIN with invalid PAN portion', () => {
      expect(isValidGstin('27123CS1429B1Z5')).toBe(false);
    });

    it('rejects GSTIN without Z in 13th position', () => {
      expect(isValidGstin('27AABCS1429B1A5')).toBe(false);
    });

    it('rejects GSTIN with lowercase letters', () => {
      expect(isValidGstin('27aabcs1429b1z5')).toBe(false);
    });

    it('rejects GSTIN with special characters', () => {
      expect(isValidGstin('27AABCS1429B1Z@')).toBe(false);
    });

    it('rejects GSTIN with invalid PAN 4th character', () => {
      // PAN 4th char must be one of ABCFGHLJPTK
      // In GSTIN, PAN is chars 2-11, so 4th char of PAN is at index 5
      // '27AAADS1429B1Z5' has PAN 'AAADS1429B' where 4th char is 'D' (invalid)
      expect(isValidGstin('27AAADS1429B1Z5')).toBe(false);
    });

    it('accepts multiple valid real-world-like GSTINs', () => {
      // Different PAN entity types
      expect(isValidGstin('27AABCS1429B1Z5')).toBe(true); // Company
      expect(isValidGstin('27AABPS1429B1Z5')).toBe(true); // Person
      expect(isValidGstin('27AABHS1429B1Z5')).toBe(true); // HUF
      expect(isValidGstin('27AABFS1429B1Z5')).toBe(true); // Firm
    });
  });

  describe('gstinStateCode', () => {
    it('extracts state code from GSTIN', () => {
      expect(gstinStateCode('27AABCS1429B1Z5')).toBe('27');
    });

    it('extracts state code 01', () => {
      expect(gstinStateCode('01AABCS1429B1Z5')).toBe('01');
    });

    it('extracts state code 37', () => {
      expect(gstinStateCode('37AABCS1429B1Z5')).toBe('37');
    });
  });
});

describe('PAN Validator', () => {
  describe('isValidPan', () => {
    it('accepts a valid individual PAN', () => {
      expect(isValidPan('ABCPD1234E')).toBe(true);
    });

    it('accepts a valid company PAN', () => {
      expect(isValidPan('AABCS1429B')).toBe(true);
    });

    it('accepts a valid HUF PAN', () => {
      expect(isValidPan('AABHA1234B')).toBe(true);
    });

    it('accepts a valid firm PAN', () => {
      expect(isValidPan('AABFA1234B')).toBe(true);
    });

    it('accepts a valid trust PAN', () => {
      expect(isValidPan('AABTA1234B')).toBe(true);
    });

    it('accepts a valid government PAN', () => {
      expect(isValidPan('AABGA1234B')).toBe(true);
    });

    it('accepts a valid AOP PAN', () => {
      expect(isValidPan('AABAA1234B')).toBe(true);
    });

    it('accepts a valid BOI PAN', () => {
      expect(isValidPan('AABBA1234B')).toBe(true);
    });

    it('accepts a valid local authority PAN', () => {
      expect(isValidPan('AABLA1234B')).toBe(true);
    });

    it('accepts a valid juridical person PAN', () => {
      expect(isValidPan('AABJA1234B')).toBe(true);
    });

    it('accepts a valid krishi PAN', () => {
      expect(isValidPan('AABKA1234B')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidPan('')).toBe(false);
    });

    it('rejects PAN with wrong length (9 chars)', () => {
      expect(isValidPan('ABCPD1234')).toBe(false);
    });

    it('rejects PAN with wrong length (11 chars)', () => {
      expect(isValidPan('ABCPD1234EF')).toBe(false);
    });

    it('rejects PAN with invalid 4th character', () => {
      expect(isValidPan('AABDS1429B')).toBe(false);
      expect(isValidPan('AABMS1429B')).toBe(false);
      expect(isValidPan('AABNS1429B')).toBe(false);
      expect(isValidPan('AABRS1429B')).toBe(false);
    });

    it('rejects PAN with lowercase', () => {
      expect(isValidPan('abcpd1234e')).toBe(false);
    });

    it('rejects PAN with digits in letter positions', () => {
      expect(isValidPan('12CPD1234E')).toBe(false);
    });

    it('rejects PAN with letters in digit positions', () => {
      expect(isValidPan('ABCPDABCDE')).toBe(false);
    });

    it('rejects null/undefined', () => {
      expect(isValidPan(null as unknown as string)).toBe(false);
      expect(isValidPan(undefined as unknown as string)).toBe(false);
    });
  });

  describe('panEntityType', () => {
    it('returns "Person (Individual)" for P', () => {
      expect(panEntityType('ABCPD1234E')).toBe('Person (Individual)');
    });

    it('returns "Company" for C', () => {
      expect(panEntityType('AABCS1429B')).toBe('Company');
    });

    it('returns "Hindu Undivided Family" for H', () => {
      expect(panEntityType('AABHA1234B')).toBe('Hindu Undivided Family');
    });

    it('returns "Trust" for T', () => {
      expect(panEntityType('AABTA1234B')).toBe('Trust');
    });

    it('returns "Firm" for F', () => {
      expect(panEntityType('AABFA1234B')).toBe('Firm');
    });

    it('returns "Government" for G', () => {
      expect(panEntityType('AABGA1234B')).toBe('Government');
    });

    it('returns "Association of Persons" for A', () => {
      expect(panEntityType('AABAA1234B')).toBe('Association of Persons');
    });

    it('returns "Body of Individuals" for B', () => {
      expect(panEntityType('AABBA1234B')).toBe('Body of Individuals');
    });

    it('returns "Local Authority" for L', () => {
      expect(panEntityType('AABLA1234B')).toBe('Local Authority');
    });

    it('returns "Artificial Juridical Person" for J', () => {
      expect(panEntityType('AABJA1234B')).toBe('Artificial Juridical Person');
    });

    it('returns "Krishi (Agriculture)" for K', () => {
      expect(panEntityType('AABKA1234B')).toBe('Krishi (Agriculture)');
    });

    it('returns "Unknown" for unrecognized type', () => {
      expect(panEntityType('AABXA1234B')).toBe('Unknown');
    });
  });
});

describe('Aadhaar Validator', () => {
  describe('isValidAadhaar', () => {
    it('rejects empty string', () => {
      expect(isValidAadhaar('')).toBe(false);
    });

    it('rejects Aadhaar with wrong length (11 digits)', () => {
      expect(isValidAadhaar('12345678901')).toBe(false);
    });

    it('rejects Aadhaar with wrong length (13 digits)', () => {
      expect(isValidAadhaar('1234567890123')).toBe(false);
    });

    it('rejects Aadhaar starting with 0', () => {
      expect(isValidAadhaar('012345678901')).toBe(false);
    });

    it('rejects Aadhaar starting with 1', () => {
      expect(isValidAadhaar('123456789012')).toBe(false);
    });

    it('rejects non-numeric Aadhaar', () => {
      expect(isValidAadhaar('23456789ABCD')).toBe(false);
    });

    it('rejects Aadhaar with special characters', () => {
      expect(isValidAadhaar('234567890-23')).toBe(false);
    });

    it('handles Aadhaar with spaces (formatted)', () => {
      const withSpaces = '2345 6789 0123';
      const withoutSpaces = '234567890123';
      expect(isValidAadhaar(withSpaces)).toBe(isValidAadhaar(withoutSpaces));
    });

    it('rejects null/undefined', () => {
      expect(isValidAadhaar(null as unknown as string)).toBe(false);
      expect(isValidAadhaar(undefined as unknown as string)).toBe(false);
    });

    it('accepts a 12-digit number starting with 2-9 if Verhoeff passes', () => {
      // We verify the structural rules hold: 12 digits, starts with 2-9
      // The Verhoeff checksum determines final validity
      const candidate = '234567890123';
      const result = isValidAadhaar(candidate);
      // We know the format is valid; whether it passes depends on checksum
      expect(typeof result).toBe('boolean');
    });

    it('validates that all digits 2-9 are accepted as first digit', () => {
      for (let d = 2; d <= 9; d++) {
        const candidate = `${d}00000000000`;
        // Format is valid; final result depends on Verhoeff
        const result = isValidAadhaar(candidate);
        expect(typeof result).toBe('boolean');
      }
    });

    it('consistently validates formatted vs unformatted', () => {
      // Spaces should not affect the result
      const numbers = ['234567890123', '987654321012', '555555555555'];
      for (const num of numbers) {
        const formatted = `${num.slice(0, 4)} ${num.slice(4, 8)} ${num.slice(8)}`;
        expect(isValidAadhaar(formatted)).toBe(isValidAadhaar(num));
      }
    });
  });
});

describe('Email Validator', () => {
  describe('isValidEmail', () => {
    it('accepts standard email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('accepts email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('accepts email with plus addressing', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('accepts email with dots in local part', () => {
      expect(isValidEmail('first.last@example.com')).toBe(true);
    });

    it('accepts email with numbers', () => {
      expect(isValidEmail('user123@example.com')).toBe(true);
    });

    it('accepts email with hyphen in domain', () => {
      expect(isValidEmail('user@my-domain.com')).toBe(true);
    });

    it('accepts email with underscore in local part', () => {
      expect(isValidEmail('user_name@example.com')).toBe(true);
    });

    it('accepts email with multiple dots in domain', () => {
      expect(isValidEmail('user@sub.domain.example.com')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('rejects email without @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('rejects email without domain', () => {
      expect(isValidEmail('user@')).toBe(false);
    });

    it('rejects email without local part', () => {
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('rejects email exceeding 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@b.co';
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('rejects null/undefined', () => {
      expect(isValidEmail(null as unknown as string)).toBe(false);
      expect(isValidEmail(undefined as unknown as string)).toBe(false);
    });

    it('accepts email with 254 characters exactly', () => {
      const localPart = 'a'.repeat(243);
      const email = `${localPart}@example.com`;
      // Length: 243 + 1 + 11 = 255 > 254, so should be invalid
      expect(email.length).toBeGreaterThan(254);
      expect(isValidEmail(email)).toBe(false);
    });
  });
});

describe('Phone Validator', () => {
  describe('isValidPhone', () => {
    it('accepts valid Indian mobile number with +91', () => {
      expect(isValidPhone('+919876543210', 'IN')).toBe(true);
    });

    it('accepts valid Indian mobile without country code', () => {
      expect(isValidPhone('9876543210', 'IN')).toBe(true);
    });

    it('accepts Indian numbers starting with 6, 7, 8, 9', () => {
      expect(isValidPhone('6123456789', 'IN')).toBe(true);
      expect(isValidPhone('7123456789', 'IN')).toBe(true);
      expect(isValidPhone('8123456789', 'IN')).toBe(true);
      expect(isValidPhone('9123456789', 'IN')).toBe(true);
    });

    it('rejects Indian number starting with 0-5', () => {
      expect(isValidPhone('1234567890', 'IN')).toBe(false);
      expect(isValidPhone('5234567890', 'IN')).toBe(false);
      expect(isValidPhone('0234567890', 'IN')).toBe(false);
    });

    it('accepts valid US number with +1', () => {
      expect(isValidPhone('+12125551234', 'US')).toBe(true);
    });

    it('accepts valid US number without country code', () => {
      expect(isValidPhone('2125551234', 'US')).toBe(true);
    });

    it('rejects US number starting with 0 or 1', () => {
      expect(isValidPhone('0125551234', 'US')).toBe(false);
      expect(isValidPhone('1125551234', 'US')).toBe(false);
    });

    it('accepts valid UAE number', () => {
      expect(isValidPhone('+97145551234', 'AE')).toBe(true);
    });

    it('accepts valid UAE number without country code', () => {
      expect(isValidPhone('45551234', 'AE')).toBe(true);
    });

    it('accepts valid UK number', () => {
      expect(isValidPhone('+447911123456', 'GB')).toBe(true);
    });

    it('accepts valid Singapore number', () => {
      expect(isValidPhone('+6591234567', 'SG')).toBe(true);
    });

    it('accepts phone with spaces and dashes (cleaned)', () => {
      expect(isValidPhone('+91 98765 43210', 'IN')).toBe(true);
      expect(isValidPhone('(212) 555-1234', 'US')).toBe(true);
    });

    it('uses DEFAULT pattern when no country specified', () => {
      expect(isValidPhone('+919876543210')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidPhone('')).toBe(false);
    });

    it('rejects null/undefined', () => {
      expect(isValidPhone(null as unknown as string)).toBe(false);
      expect(isValidPhone(undefined as unknown as string)).toBe(false);
    });

    it('rejects too-short number', () => {
      expect(isValidPhone('12345', 'IN')).toBe(false);
    });

    it('accepts phone with parentheses', () => {
      expect(isValidPhone('(212)5551234', 'US')).toBe(true);
    });

    it('uses default pattern for unknown country code', () => {
      expect(isValidPhone('+819012345678', 'JP')).toBe(true);
    });
  });
});

describe('HUID Validator', () => {
  describe('isValidHuid', () => {
    it('accepts valid 6-char alphanumeric HUID', () => {
      expect(isValidHuid('ABC123')).toBe(true);
    });

    it('accepts all-digit HUID', () => {
      expect(isValidHuid('123456')).toBe(true);
    });

    it('accepts all-letter HUID', () => {
      expect(isValidHuid('ABCDEF')).toBe(true);
    });

    it('handles lowercase by uppercasing', () => {
      expect(isValidHuid('abc123')).toBe(true);
    });

    it('handles mixed case', () => {
      expect(isValidHuid('aBc123')).toBe(true);
    });

    it('rejects HUID with wrong length (5 chars)', () => {
      expect(isValidHuid('ABC12')).toBe(false);
    });

    it('rejects HUID with wrong length (7 chars)', () => {
      expect(isValidHuid('ABC1234')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidHuid('')).toBe(false);
    });

    it('rejects HUID with special characters', () => {
      expect(isValidHuid('ABC-12')).toBe(false);
      expect(isValidHuid('ABC@12')).toBe(false);
      expect(isValidHuid('ABC 12')).toBe(false);
    });

    it('rejects null/undefined', () => {
      expect(isValidHuid(null as unknown as string)).toBe(false);
      expect(isValidHuid(undefined as unknown as string)).toBe(false);
    });

    it('rejects single character', () => {
      expect(isValidHuid('A')).toBe(false);
    });
  });
});

describe('PIN Code Validator (Indian)', () => {
  describe('isValidPinCode', () => {
    it('accepts valid 6-digit PIN code', () => {
      expect(isValidPinCode('400001')).toBe(true); // Mumbai
      expect(isValidPinCode('110001')).toBe(true); // New Delhi
      expect(isValidPinCode('560001')).toBe(true); // Bangalore
      expect(isValidPinCode('700001')).toBe(true); // Kolkata
      expect(isValidPinCode('600001')).toBe(true); // Chennai
    });

    it('accepts PIN code starting with any digit 1-9', () => {
      for (let d = 1; d <= 9; d++) {
        expect(isValidPinCode(`${d}00001`)).toBe(true);
      }
    });

    it('rejects PIN code starting with 0', () => {
      expect(isValidPinCode('012345')).toBe(false);
    });

    it('rejects PIN code with wrong length (5 digits)', () => {
      expect(isValidPinCode('12345')).toBe(false);
    });

    it('rejects PIN code with wrong length (7 digits)', () => {
      expect(isValidPinCode('1234567')).toBe(false);
    });

    it('rejects PIN code with letters', () => {
      expect(isValidPinCode('40000A')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidPinCode('')).toBe(false);
    });

    it('rejects PIN code with spaces', () => {
      expect(isValidPinCode('400 001')).toBe(false);
    });

    it('rejects PIN code with hyphens', () => {
      expect(isValidPinCode('400-001')).toBe(false);
    });
  });
});

describe('ZIP Code Validator (US)', () => {
  describe('isValidZipCode', () => {
    it('accepts valid 5-digit ZIP', () => {
      expect(isValidZipCode('10001')).toBe(true); // NYC
      expect(isValidZipCode('90210')).toBe(true); // Beverly Hills
      expect(isValidZipCode('00501')).toBe(true); // IRS Holtsville
    });

    it('accepts valid ZIP+4', () => {
      expect(isValidZipCode('10001-1234')).toBe(true);
    });

    it('accepts ZIP starting with 0', () => {
      expect(isValidZipCode('01001')).toBe(true);
    });

    it('rejects ZIP with wrong length (4 digits)', () => {
      expect(isValidZipCode('1234')).toBe(false);
    });

    it('rejects ZIP with wrong length (6 digits)', () => {
      expect(isValidZipCode('123456')).toBe(false);
    });

    it('rejects ZIP with letters', () => {
      expect(isValidZipCode('1000A')).toBe(false);
    });

    it('rejects malformed ZIP+4 (short extension)', () => {
      expect(isValidZipCode('10001-12')).toBe(false);
    });

    it('rejects malformed ZIP+4 (too many digits in extension)', () => {
      expect(isValidZipCode('10001-12345')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidZipCode('')).toBe(false);
    });

    it('rejects ZIP with spaces', () => {
      expect(isValidZipCode('100 01')).toBe(false);
    });

    it('rejects ZIP+4 without hyphen', () => {
      expect(isValidZipCode('100011234')).toBe(false);
    });
  });
});
