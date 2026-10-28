import { describe, expect, it } from 'vitest';
import {
  actualPausedDays,
  addDays,
  checkPackEligibility,
  computeGraceEnd,
  computeRenewalEnd,
  daysLeft,
  maskCardNumber,
  pauseDaysRemaining,
} from './tv-rules.js';

const now = new Date('2026-10-28T10:00:00Z');

describe('renewal date maths', () => {
  it('extends from the current end date while the pack is still active', () => {
    const end = new Date('2026-11-10T10:00:00Z');
    expect(computeRenewalEnd(end, now, 30)).toEqual(addDays(end, 30));
  });

  it('starts from now when the pack already expired', () => {
    const end = new Date('2026-10-01T10:00:00Z');
    expect(computeRenewalEnd(end, now, 30)).toEqual(addDays(now, 30));
  });

  it('starts from now when there is no previous end date, or it ends exactly now', () => {
    expect(computeRenewalEnd(null, now, 30)).toEqual(addDays(now, 30));
    expect(computeRenewalEnd(now, now, 30)).toEqual(addDays(now, 30));
  });

  it('computes the grace period end and days left', () => {
    expect(computeGraceEnd(now, 3)).toEqual(addDays(now, 3));
    expect(daysLeft(addDays(now, 5), now)).toBe(5);
    expect(daysLeft(addDays(now, -2), now)).toBe(0);
  });
});

describe('pack eligibility rules', () => {
  const ok = { planType: 'BASE' as const, planRequires4k: false, boxResolution: 'HD' as const, hasActiveBase: false };

  it('allows a base pack without any existing base pack', () => {
    expect(checkPackEligibility(ok)).toBeNull();
  });

  it('rejects an add-on without an active base pack', () => {
    expect(checkPackEligibility({ ...ok, planType: 'ADD_ON' })).toBe('ADD_ON_REQUIRES_BASE_PACK');
    expect(checkPackEligibility({ ...ok, planType: 'ADD_ON', hasActiveBase: true })).toBeNull();
  });

  it('rejects 4K packs on an HD box and allows them on a 4K box', () => {
    const fourK = { ...ok, planRequires4k: true, hasActiveBase: true };
    expect(checkPackEligibility(fourK)).toBe('PACK_REQUIRES_4K_BOX');
    expect(checkPackEligibility({ ...fourK, boxResolution: 'UHD_4K' })).toBeNull();
  });
});

describe('pause maths', () => {
  it('counts remaining days inside the window and resets after 365 days', () => {
    expect(pauseDaysRemaining(30, 12, addDays(now, -100), now)).toBe(18);
    expect(pauseDaysRemaining(30, 30, addDays(now, -100), now)).toBe(0);
    expect(pauseDaysRemaining(30, 30, addDays(now, -366), now)).toBe(30);
    expect(pauseDaysRemaining(30, 0, null, now)).toBe(30);
  });

  it('rounds actual paused days up, minimum 1, capped at the plan', () => {
    expect(actualPausedDays(now, addDays(now, 3.2), 10)).toBe(4);
    expect(actualPausedDays(now, new Date(now.getTime() + 1000), 10)).toBe(1);
    expect(actualPausedDays(now, addDays(now, 20), 10)).toBe(10);
  });
});

describe('smart card masking', () => {
  it('only exposes the last 4 digits', () => {
    expect(maskCardNumber('100100000007')).toBe('•••• 0007');
    expect(maskCardNumber(null)).toBeNull();
  });
});
