import { describe, expect, it } from 'vitest';
import {
  analyzeNumberRarity,
  generateBusinessCandidatesBatch,
  generatePersonalCandidatesBatch,
  generateRandomBusinessNumber,
  generateRandomPersonalNumber,
  validateIndianMobileNumber,
} from './numbers-generator.engine.js';
import { PhoneNumberType } from '../generated/prisma/enums.js';

describe('Number Generation Engine Tests', () => {
  describe('Indian Phone Number Validation', () => {
    it('validates standard personal Indian numbers starting with 6, 7, 8, or 9', () => {
      expect(validateIndianMobileNumber('+919876543210').isValid).toBe(true);
      expect(validateIndianMobileNumber('+918888777766').isValid).toBe(true);
      expect(validateIndianMobileNumber('+917012345678').isValid).toBe(true);
      expect(validateIndianMobileNumber('+916234567890').isValid).toBe(true);
    });

    it('rejects numbers not starting with +91', () => {
      const res = validateIndianMobileNumber('9876543210');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('+91');
    });

    it('rejects numbers with wrong length', () => {
      const res = validateIndianMobileNumber('+91987654321'); // 12 chars
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('length');
    });

    it('rejects personal numbers starting with 1, 2, 3, 4, 5', () => {
      const res = validateIndianMobileNumber('+915876543210');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('must start with 6, 7, 8, or 9');
    });

    it('validates business numbers with 4-digit prefix', () => {
      const res = validateIndianMobileNumber(
        '+910482123456',
        true,
        '0482',
      );
      expect(res.isValid).toBe(true);
    });

    it('rejects business numbers if prefix does not match', () => {
      const res = validateIndianMobileNumber(
        '+919999123456',
        true,
        '0482',
      );
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('must begin with prefix 0482');
    });
  });

  describe('Random Number Generation', () => {
    it('generates a valid personal Indian number', () => {
      const num = generateRandomPersonalNumber();
      expect(num).toMatch(/^\+91[6-9]\d{9}$/);
      expect(validateIndianMobileNumber(num).isValid).toBe(true);
    });

    it('generates a business number with 4-digit prefix and 6 random digits', () => {
      const prefix = '0482';
      const num = generateRandomBusinessNumber(prefix);
      expect(num.startsWith(`+91${prefix}`)).toBe(true);
      expect(num.length).toBe(13);
      expect(validateIndianMobileNumber(num, true, prefix).isValid).toBe(true);
    });

    it('throws error when generating business number with invalid prefix', () => {
      expect(() => generateRandomBusinessNumber('12')).toThrow(
        'Business prefix must be exactly 4 digits',
      );
      expect(() => generateRandomBusinessNumber('12345')).toThrow(
        'Business prefix must be exactly 4 digits',
      );
      expect(() => generateRandomBusinessNumber('abcd')).toThrow(
        'Business prefix must be exactly 4 digits',
      );
    });
  });

  describe('Rarity / VIP Pattern Analyzer', () => {
    it('identifies quad repeated digits as PREMIUM', () => {
      const res = analyzeNumberRarity('+919876999912');
      expect(res.type).toBe(PhoneNumberType.PREMIUM);
      expect(res.tags).toContain('QUAD_DIGITS');
      expect(res.price).toBeGreaterThan(0);
    });

    it('identifies auspicious 786 as PREMIUM', () => {
      const res = analyzeNumberRarity('+919876578610');
      expect(res.type).toBe(PhoneNumberType.PREMIUM);
      expect(res.tags).toContain('AUSPICIOUS_786');
    });

    it('identifies sequential runs like 1234 as PREMIUM', () => {
      const res = analyzeNumberRarity('+919812345670');
      expect(res.type).toBe(PhoneNumberType.PREMIUM);
      expect(res.tags).toContain('SEQUENTIAL_RUN');
    });

    it('identifies ordinary random numbers as STANDARD with price 0', () => {
      const res = analyzeNumberRarity('+919835174620');
      expect(res.type).toBe(PhoneNumberType.STANDARD);
      expect(res.price).toBe(0);
    });
  });

  describe('Batch Generation', () => {
    it('generates 10 unique personal candidates', () => {
      const batch = generatePersonalCandidatesBatch(10);
      expect(batch.length).toBe(10);
      const set = new Set(batch.map((b) => b.number));
      expect(set.size).toBe(10);
      for (const item of batch) {
        expect(validateIndianMobileNumber(item.number).isValid).toBe(true);
      }
    });

    it('generates 10 unique business candidates with prefix 0482', () => {
      const prefix = '0482';
      const batch = generateBusinessCandidatesBatch(prefix, 10);
      expect(batch.length).toBe(10);
      const set = new Set(batch.map((b) => b.number));
      expect(set.size).toBe(10);
      for (const item of batch) {
        expect(
          validateIndianMobileNumber(item.number, true, prefix).isValid,
        ).toBe(true);
        expect(item.number.startsWith(`+91${prefix}`)).toBe(true);
      }
    });
  });
});
