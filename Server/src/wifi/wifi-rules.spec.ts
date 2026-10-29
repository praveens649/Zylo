import { describe, expect, it } from 'vitest';
import {
  actualPausedDays,
  addDays,
  checkPlanEligibility,
  computeGraceEnd,
  computeRenewalEnd,
  daysLeft,
  maskMacAddress,
  pauseDaysRemaining,
} from './wifi-rules.js';

const now = new Date('2026-10-28T10:00:00Z');

describe('renewal date maths', () => {
  it('extends from the current end date while the plan is still active', () => {
    const end = new Date('2026-11-10T10:00:00Z');
    expect(computeRenewalEnd(end, now, 30)).toEqual(addDays(end, 30));
  });

  it('starts from now when the plan already expired', () => {
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

describe('plan eligibility rules', () => {
  const ok = { planType: 'BASE' as const, planRequiresTriBand: false, deviceBand: 'DUAL_BAND' as const, hasActiveBase: false };

  it('allows a base plan without any existing base plan', () => {
    expect(checkPlanEligibility(ok)).toBeNull();
  });

  it('rejects an add-on without an active base plan', () => {
    expect(checkPlanEligibility({ ...ok, planType: 'ADD_ON' })).toBe('ADD_ON_REQUIRES_BASE_PLAN');
    expect(checkPlanEligibility({ ...ok, planType: 'ADD_ON', hasActiveBase: true })).toBeNull();
  });

  it('rejects gigabit plans on a dual-band router and allows them on tri-band', () => {
    const gig = { ...ok, planRequiresTriBand: true, hasActiveBase: true };
    expect(checkPlanEligibility(gig)).toBe('PLAN_REQUIRES_TRI_BAND_ROUTER');
    expect(checkPlanEligibility({ ...gig, deviceBand: 'TRI_BAND' })).toBeNull();
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

describe('router MAC masking', () => {
  it('only exposes the last octets', () => {
    expect(maskMacAddress('02:5A:01:00:00:0A')).toBe('••:•• 00:0A');
    expect(maskMacAddress(null)).toBeNull();
  });
});
