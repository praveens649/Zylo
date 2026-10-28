/**
 * Pure business rules for the Set-Top Box module — no database access, so
 * every date calculation and eligibility rule can be unit-tested directly.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Renewal: extend from the current end date while the pack is still active,
 * otherwise start from now.
 */
export function computeRenewalEnd(
  currentEnd: Date | null | undefined,
  now: Date,
  validityDays: number,
): Date {
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return addDays(base, validityDays);
}

export function computeGraceEnd(expiredAt: Date, graceDays: number): Date {
  return addDays(expiredAt, graceDays);
}

export interface AddOnCheck {
  planType: 'BASE' | 'ADD_ON';
  planRequires4k: boolean;
  boxResolution: 'HD' | 'UHD_4K';
  /** True when a base pack is active (or is being bought in the same cart). */
  hasActiveBase: boolean;
}

/** Returns an error code when the pack cannot be added, otherwise null. */
export function checkPackEligibility(c: AddOnCheck): string | null {
  if (c.planRequires4k && c.boxResolution !== 'UHD_4K') return 'PACK_REQUIRES_4K_BOX';
  if (c.planType === 'ADD_ON' && !c.hasActiveBase) return 'ADD_ON_REQUIRES_BASE_PACK';
  return null;
}

export const PAUSE_WINDOW_DAYS = 365;

/** Days already consumed inside the current pause window (resets after 365 days). */
export function pauseDaysUsedInWindow(
  used: number,
  windowStartedAt: Date | null | undefined,
  now: Date,
): number {
  if (!windowStartedAt) return 0;
  return now.getTime() - windowStartedAt.getTime() >= PAUSE_WINDOW_DAYS * DAY_MS ? 0 : used;
}

export function pauseDaysRemaining(
  maxPerYear: number,
  used: number,
  windowStartedAt: Date | null | undefined,
  now: Date,
): number {
  return Math.max(0, maxPerYear - pauseDaysUsedInWindow(used, windowStartedAt, now));
}

/** Whole days actually spent paused (rounded up, minimum 1, capped at the planned length). */
export function actualPausedDays(pausedAt: Date, resumedAt: Date, plannedDays: number): number {
  const elapsed = Math.ceil((resumedAt.getTime() - pausedAt.getTime()) / DAY_MS);
  return Math.min(plannedDays, Math.max(1, elapsed));
}

export function daysLeft(endDate: Date | null | undefined, now: Date): number {
  if (!endDate) return 0;
  return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / DAY_MS));
}

export function maskCardNumber(card: string | null | undefined): string | null {
  return card ? `•••• ${card.slice(-4)}` : null;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
