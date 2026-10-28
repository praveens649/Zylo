import { PhoneNumberType } from '../generated/prisma/enums.js';

export interface GeneratedCandidate {
  number: string;
  prefix?: string;
  type: PhoneNumberType;
  price: number;
  tags: string[];
}

export interface NumberGenerationOptions {
  count?: number;
  prefix?: string;
  organizationId?: string;
  allowPremium?: boolean;
}

/**
 * Validates Indian standard mobile numbers.
 * Personal format: +91 followed by 10 digits starting with 6, 7, 8, or 9 (TRAI/DoT standard).
 * Business format: +91 followed by 4-digit organization prefix and 6 remaining digits.
 */
export function validateIndianMobileNumber(
  number: string,
  isBusiness = false,
  businessPrefix?: string,
): { isValid: boolean; error?: string } {
  if (!number || typeof number !== 'string') {
    return { isValid: false, error: 'Phone number must be a non-empty string' };
  }

  // E.164 total length for India (+91 + 10 digits = 13 characters)
  if (number.length !== 13) {
    return {
      isValid: false,
      error: `Invalid length: Expected 13 characters (e.g. +919876543210), got ${number.length}`,
    };
  }

  if (!number.startsWith('+91')) {
    return {
      isValid: false,
      error: 'Phone number must start with Indian country code +91',
    };
  }

  const digits = number.slice(3);
  if (!/^\d{10}$/.test(digits)) {
    return {
      isValid: false,
      error: 'The 10 characters following +91 must be digits',
    };
  }

  if (isBusiness) {
    if (businessPrefix) {
      if (!/^\d{4}$/.test(businessPrefix)) {
        return {
          isValid: false,
          error: 'Business prefix must be exactly 4 digits',
        };
      }
      if (!digits.startsWith(businessPrefix)) {
        return {
          isValid: false,
          error: `Business number must begin with prefix ${businessPrefix}`,
        };
      }
    }
  } else {
    // Standard Indian personal mobile series starts with 6, 7, 8, or 9
    const firstDigit = digits[0];
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
      return {
        isValid: false,
        error: `Personal mobile number must start with 6, 7, 8, or 9. Got: ${firstDigit}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Analyzes a 10-digit number for VIP/Fancy patterns:
 * - 4+ repeated digits (e.g. 9999, 7777, 0000)
 * - Sequential ascending/descending runs (e.g. 1234, 9876)
 * - Auspicious cultural numbers (e.g. 786, 007)
 * - Palindromic endings (e.g. 1221, 9889)
 * - Triplets ending (e.g. 888, 777)
 */
export function analyzeNumberRarity(number: string): {
  type: PhoneNumberType;
  price: number;
  tags: string[];
} {
  const digits = number.startsWith('+91') ? number.slice(3) : number;
  const tags: string[] = [];
  let isPremium = false;
  let price = 0;

  // 1. Quad+ repeated digits in a row (e.g., 9999, 8888, 0000)
  if (/(\d)\1{3,}/.test(digits)) {
    tags.push('QUAD_DIGITS');
    isPremium = true;
    price = 999.0;
  }

  // 2. Auspicious / Special numbers
  if (digits.includes('786')) {
    tags.push('AUSPICIOUS_786');
    isPremium = true;
    price = Math.max(price, 786.0);
  }
  if (digits.endsWith('007')) {
    tags.push('AGENT_007');
    isPremium = true;
    price = Math.max(price, 499.0);
  }

  // 3. Sequential 4-digit runs (1234, 2345, 6789, 4321, etc.)
  const sequentialPatterns = [
    '0123',
    '1234',
    '2345',
    '3456',
    '4567',
    '5678',
    '6789',
    '9876',
    '8765',
    '7654',
    '6543',
    '5432',
    '4321',
    '3210',
  ];
  for (const seq of sequentialPatterns) {
    if (digits.includes(seq)) {
      tags.push('SEQUENTIAL_RUN');
      isPremium = true;
      price = Math.max(price, 499.0);
      break;
    }
  }

  // 4. Triple repeated digits at end (e.g. ending in 777, 888, 999)
  if (/(\d)\1{2}$/.test(digits)) {
    tags.push('TRIPLE_ENDING');
    isPremium = true;
    price = Math.max(price, 399.0);
  }

  // 5. Palindrome in the last 4 digits (e.g. 1221, 5665, 9009)
  const last4 = digits.slice(-4);
  if (
    last4[0] === last4[3] &&
    last4[1] === last4[2] &&
    last4[0] !== last4[1]
  ) {
    tags.push('PALINDROME_SUFFIX');
    isPremium = true;
    price = Math.max(price, 299.0);
  }

  // 6. Double pairs (e.g., 2020, 5050, 9988)
  if (
    (last4[0] === last4[2] && last4[1] === last4[3]) ||
    (last4[0] === last4[1] && last4[2] === last4[3])
  ) {
    if (!tags.includes('QUAD_DIGITS')) {
      tags.push('PAIR_PATTERN');
      isPremium = true;
      price = Math.max(price, 249.0);
    }
  }

  if (isPremium) {
    return {
      type: PhoneNumberType.PREMIUM,
      price,
      tags,
    };
  }

  return {
    type: PhoneNumberType.STANDARD,
    price: 0.0,
    tags: ['STANDARD'],
  };
}

/**
 * Generates a random standard Indian personal mobile number.
 * Starts with 6, 7, 8, or 9 followed by 9 random digits.
 */
export function generateRandomPersonalNumber(): string {
  const firstDigits = ['6', '7', '8', '9'];
  const firstDigit =
    firstDigits[Math.floor(Math.random() * firstDigits.length)];
  let remaining9 = '';
  for (let i = 0; i < 9; i++) {
    remaining9 += Math.floor(Math.random() * 10).toString();
  }
  return `+91${firstDigit}${remaining9}`;
}

/**
 * Generates a random business number based on a 4-digit prefix.
 * Result: +91 + [4-digit prefix] + [6 random digits]
 * Example: prefix "0482" -> +910482XXXXXX
 */
export function generateRandomBusinessNumber(prefix: string): string {
  const sanitizedPrefix = prefix.trim();
  if (!/^\d{4}$/.test(sanitizedPrefix)) {
    throw new Error('Business prefix must be exactly 4 digits');
  }

  let remaining6 = '';
  for (let i = 0; i < 6; i++) {
    remaining6 += Math.floor(Math.random() * 10).toString();
  }

  return `+91${sanitizedPrefix}${remaining6}`;
}

/**
 * Generates a batch of unique candidates for personal numbers.
 */
export function generatePersonalCandidatesBatch(
  count: number,
  allowPremium = true,
): GeneratedCandidate[] {
  const results: GeneratedCandidate[] = [];
  const seenNumbers = new Set<string>();

  let attempts = 0;
  const maxAttempts = count * 20;

  while (results.length < count && attempts < maxAttempts) {
    attempts++;
    const rawNumber = generateRandomPersonalNumber();

    if (seenNumbers.has(rawNumber)) continue;
    seenNumbers.add(rawNumber);

    const rarity = analyzeNumberRarity(rawNumber);
    if (!allowPremium && rarity.type === PhoneNumberType.PREMIUM) {
      continue;
    }

    results.push({
      number: rawNumber,
      prefix: rawNumber.slice(3, 7), // First 4 digits for indexing/filtering
      type: rarity.type,
      price: rarity.price,
      tags: rarity.tags,
    });
  }

  return results;
}

/**
 * Generates a batch of unique candidates for business numbers.
 */
export function generateBusinessCandidatesBatch(
  prefix: string,
  count: number,
): GeneratedCandidate[] {
  const sanitizedPrefix = prefix.trim();
  if (!/^\d{4}$/.test(sanitizedPrefix)) {
    throw new Error('Business prefix must be exactly 4 digits');
  }

  const results: GeneratedCandidate[] = [];
  const seenNumbers = new Set<string>();

  let attempts = 0;
  const maxAttempts = count * 25;

  while (results.length < count && attempts < maxAttempts) {
    attempts++;
    const rawNumber = generateRandomBusinessNumber(sanitizedPrefix);

    if (seenNumbers.has(rawNumber)) continue;
    seenNumbers.add(rawNumber);

    const rarity = analyzeNumberRarity(rawNumber);

    results.push({
      number: rawNumber,
      prefix: sanitizedPrefix,
      type: rarity.type,
      // Business numbers within organization pool are standard 0 or special if requested
      price: rarity.price,
      tags: ['BUSINESS', ...rarity.tags],
    });
  }

  return results;
}
